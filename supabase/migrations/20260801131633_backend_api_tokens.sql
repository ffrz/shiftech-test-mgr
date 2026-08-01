-- Backend Go validation spike (backend/VALIDATION.md S1): MCP API-token auth.
-- Scoped to one project per token. Raw token is never persisted, only its SHA-256 hash.
-- Schema ported from ../../NvlFr-testify/supabase/schema_019_p2_api_webhooks.sql
-- (api_tokens portion only — webhooks table intentionally not ported, out of scope).

create table if not exists api_tokens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  token_prefix text not null check (char_length(token_prefix) between 6 and 20),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  scopes text[] not null default array['read:project']::text[],
  revoked_at timestamptz,
  created_by uuid not null references profiles(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_api_tokens_project_active on api_tokens(project_id, created_at desc) where revoked_at is null;

-- Internal validation tool for now (backend spike) — RLS left permissive,
-- auth is enforced by the Go backend validating token_hash, not by RLS.
alter table api_tokens enable row level security;
create policy "allow all - api_tokens" on api_tokens for all using (true) with check (true);
