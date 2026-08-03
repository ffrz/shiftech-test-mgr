-- Track when an MCP agent token was last used, so the UI can show "last used X
-- minutes ago" on the Agent Tokens tab (with a hover tooltip for the exact time).
--
-- last_used_at is written here (inside mcp_begin_tool_call) rather than in a
-- separate path so any governed MCP tool call bumps it atomically with the
-- audit 'started' row — no extra round-trip, no separate RPC.

alter table api_tokens
  add column if not exists last_used_at timestamptz;

-- Re-declare mcp_begin_tool_call to also stamp the token's last_used_at when a
-- tool call starts. Same body as 20260801140000_backend_mcp_governance.sql
-- with the two added lines after the token lookup succeeds.
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

  update api_tokens set last_used_at = clock_timestamp() where id = v_token.id;

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

-- Grants survive a create-or-replace, but re-asserting them keeps the migration
-- idempotent if the function signature ever changes.
revoke all on function mcp_begin_tool_call(text, uuid, text, integer, integer) from public;
grant execute on function mcp_begin_tool_call(text, uuid, text, integer, integer) to anon;
