-- Self-service MCP agent token minting. Replaces the wide-open "allow all"
-- api_tokens policy (backend spike leftover, 20260801131633) with real RLS,
-- and adds a security-definer RPC so the SPA can mint/revoke tokens directly
-- via supabase.rpc(), following the same pattern as respond_to_project_invitation
-- / create_notification / reactivate_account.
--
-- Any accepted project member can mint a token for themselves, but the scopes
-- they can grant are capped by their own project_members.role — mirrors the
-- existing capability boundaries (can_edit_project_content / can_run_tests /
-- can_manage_issues in 20260725000009), just translated into a scope list
-- instead of a boolean gate.

-- === Lock down api_tokens RLS ===

drop policy if exists "allow all - api_tokens" on api_tokens;

create policy "owner or manager - api_tokens select" on api_tokens for select
  using (created_by = auth.uid() or is_project_manager(project_id));

create policy "owner or manager - api_tokens revoke" on api_tokens for update
  using (created_by = auth.uid() or is_project_manager(project_id))
  with check (created_by = auth.uid() or is_project_manager(project_id));

-- No insert/delete policy for the authenticated role: creation only happens
-- via mint_api_token() (security definer, bypasses RLS), revocation is an
-- update (revoked_at), never a hard delete — keeps the audit trail.

-- === Role -> scope cap ===

create or replace function allowed_token_scopes(p_role text)
returns text[] as $$
  select case p_role
    when 'manager' then array[
      'read:project', 'read:test-cases', 'read:test-plans', 'read:test-runs', 'read:issues', 'read:automation',
      'write:test-cases', 'write:test-plans', 'write:test-runs', 'write:issues', 'write:automation'
    ]
    when 'supervisor' then array[
      'read:project', 'read:test-cases', 'read:test-plans', 'read:test-runs', 'read:issues', 'read:automation',
      'write:test-cases', 'write:test-plans', 'write:issues'
    ]
    when 'tester' then array[
      'read:project', 'read:test-cases', 'read:test-plans', 'read:test-runs', 'read:issues', 'read:automation',
      'write:test-runs', 'write:issues'
    ]
    when 'member' then array[
      'read:project', 'read:test-cases', 'read:test-plans', 'read:test-runs', 'read:issues', 'read:automation'
    ]
    else array[]::text[]
  end;
$$ language sql immutable;

-- === Mint ===

create or replace function mint_api_token(p_project_id uuid, p_name text, p_scopes text[])
returns table(token text, id uuid) as $$
declare
  v_role text;
  v_raw_token text;
  v_disallowed text[];
  v_id uuid;
begin
  select role into v_role
  from project_members
  where project_id = p_project_id and user_id = auth.uid() and status = 'accepted';

  if v_role is null and exists (select 1 from projects where id = p_project_id and owner_id = auth.uid()) then
    v_role := 'manager';
  end if;

  if v_role is null then
    raise exception 'no accepted membership on this project';
  end if;

  select array_agg(s) into v_disallowed
  from unnest(p_scopes) as s
  where not (s = any (allowed_token_scopes(v_role)));

  if v_disallowed is not null then
    raise exception 'scopes not allowed for role %: %', v_role, v_disallowed;
  end if;

  v_raw_token := 'tm_' || encode(extensions.gen_random_bytes(32), 'hex');

  insert into api_tokens (project_id, name, token_prefix, token_hash, scopes, created_by)
  values (
    p_project_id,
    p_name,
    left(v_raw_token, 10),
    encode(extensions.digest(v_raw_token, 'sha256'), 'hex'),
    p_scopes,
    auth.uid()
  )
  returning api_tokens.id into v_id;

  return query select v_raw_token, v_id;
end;
$$ language plpgsql security definer set search_path = public;

-- === Revoke ===

create or replace function revoke_api_token(p_token_id uuid)
returns void as $$
declare
  v_project_id uuid;
begin
  select project_id into v_project_id from api_tokens where id = p_token_id and revoked_at is null;

  if v_project_id is null then
    raise exception 'token not found or already revoked';
  end if;

  update api_tokens
  set revoked_at = now(), updated_at = now()
  where id = p_token_id
    and (created_by = auth.uid() or is_project_manager(v_project_id));

  if not found then
    raise exception 'not permitted to revoke this token';
  end if;
end;
$$ language plpgsql security definer set search_path = public;
