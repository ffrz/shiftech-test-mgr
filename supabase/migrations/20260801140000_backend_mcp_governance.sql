-- Backend Go governance (T1.2): MCP tool-call rate limit + audit trail.
-- Ported from ../../NvlFr-testify/supabase/schema_059_mcp_rate_limit_audit.sql
-- with two project-specific adjustments:
--   1. Tool-name prefix uses the Go port's `testify.` (not `testmanager.`),
--      and the tool segment allows CamelCase (createBulk, addCases, ...).
--   2. ai_audit_events is created here because this project does not yet
--      have the AI-integration migration it originates from (schema_023);
--      only the columns/constraints needed by the MCP governance RPCs are
--      ported, the rest stays out of scope until Epic 9 (AI audit trail).
--
-- Security notes (mirror the original): audit rows intentionally contain no
-- MCP arguments, result payloads, or raw tokens. mcp_tool_rate_limits is
-- internal-only: no role can touch it directly, only the two security-definer
-- RPCs below.

create table if not exists ai_audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  action text,
  provider text,
  model text,
  prompt_version text,
  request_hash text,
  tool_name text check (tool_name is null or char_length(tool_name) between 1 and 150),
  status text not null check (status in ('started', 'completed', 'failed', 'rate_limited')),
  created_by uuid references profiles(id) on delete set null,
  target_type text,
  target_id uuid,
  error_code text,
  latency_ms integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint ai_audit_events_action_or_tool_check
    check (
      (action in ('generate_test_cases', 'test_run_analysis', 'issue_draft', 'duplicate_issue_detection', 'assistant_search', 'approve_draft') and tool_name is null)
      or (action is null and tool_name is not null and char_length(tool_name) between 1 and 150)
    )
);

create index if not exists idx_ai_audit_events_project_created
  on ai_audit_events(project_id, created_at desc);
create index if not exists idx_ai_audit_events_mcp_tool_created
  on ai_audit_events(project_id, tool_name, created_at desc)
  where tool_name is not null;

alter table ai_audit_events enable row level security;
drop policy if exists "project members - ai audit select" on ai_audit_events;
create policy "project members - ai audit select" on ai_audit_events
  for select using (has_project_access(project_id));

create table if not exists mcp_tool_rate_limits (
  token_id uuid not null references api_tokens(id) on delete cascade,
  tool_name text not null check (char_length(tool_name) between 1 and 150),
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (token_id, tool_name, window_started_at)
);

alter table mcp_tool_rate_limits enable row level security;
revoke all on table mcp_tool_rate_limits from public, anon, authenticated;

create or replace function mcp_begin_tool_call(
  p_token text,
  p_project_id uuid,
  p_tool_name text,
  p_limit integer default 120,
  p_window_seconds integer default 60
)
returns table(audit_id uuid, allowed boolean)
as $$
declare
  v_token api_tokens%rowtype;
  v_window timestamptz;
  v_count integer;
  v_audit_id uuid;
  v_allowed boolean;
begin
  if p_token is null or p_token !~ '^tm_[0-9a-f]{64}$'
    or p_tool_name is null or p_tool_name !~ '^testify\.[a-z0-9_]+\.[a-zA-Z0-9_]+$'
    or p_limit < 1 or p_limit > 10000
    or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid MCP governance request';
  end if;

  select t.* into v_token
  from api_tokens t
  where t.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and t.project_id = p_project_id and t.revoked_at is null;
  if v_token.id is null then raise exception 'invalid MCP credentials'; end if;

  v_window := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into mcp_tool_rate_limits(token_id, tool_name, window_started_at, request_count)
  values (v_token.id, p_tool_name, v_window, 1)
  on conflict (token_id, tool_name, window_started_at)
  do update set request_count = mcp_tool_rate_limits.request_count + 1
  returning request_count into v_count;
  v_allowed := v_count <= p_limit;

  insert into ai_audit_events(project_id, tool_name, status, created_by, latency_ms, completed_at)
  values (p_project_id, p_tool_name, case when v_allowed then 'started' else 'rate_limited' end,
    v_token.created_by, case when v_allowed then null else 0 end, case when v_allowed then null else clock_timestamp() end)
  returning id into v_audit_id;

  delete from mcp_tool_rate_limits where token_id = v_token.id and tool_name = p_tool_name and window_started_at < v_window;
  return query select v_audit_id, v_allowed;
end;
$$ language plpgsql security definer set search_path = public, extensions;

create or replace function mcp_complete_tool_call(
  p_token text,
  p_project_id uuid,
  p_audit_id uuid,
  p_status text,
  p_latency_ms integer
)
returns void
as $$
declare v_token_id uuid;
begin
  if p_status not in ('completed', 'failed') or p_latency_ms < 0 then
    raise exception 'invalid MCP audit completion';
  end if;
  select t.id into v_token_id from api_tokens t
  where t.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and t.project_id = p_project_id and t.revoked_at is null;
  if v_token_id is null then raise exception 'invalid MCP credentials'; end if;

  update ai_audit_events
  set status = p_status, latency_ms = p_latency_ms, completed_at = clock_timestamp()
  where id = p_audit_id and project_id = p_project_id and tool_name is not null and status = 'started';
  if not found then raise exception 'MCP audit event not found'; end if;
end;
$$ language plpgsql security definer set search_path = public, extensions;

revoke all on function mcp_begin_tool_call(text, uuid, text, integer, integer) from public;
revoke all on function mcp_complete_tool_call(text, uuid, uuid, text, integer) from public;
grant execute on function mcp_begin_tool_call(text, uuid, text, integer, integer) to anon;
grant execute on function mcp_complete_tool_call(text, uuid, uuid, text, integer) to anon;
