-- Fix "column reference 'id' is ambiguous" (42702) in mint_api_token(). The function's
-- `returns table(token text, id uuid)` signature implicitly declares an OUT parameter
-- named `id`, which collides with the unqualified `api_tokens.id` column reference used
-- in WHERE/RETURNING clauses throughout the function body and in revoke_api_token()'s
-- lookup. Qualify every reference to the table's `id` column explicitly.

create or replace function mint_api_token(p_project_id uuid, p_name text, p_scopes text[])
returns table(token text, id uuid) as $$
declare
  v_role text;
  v_raw_token text;
  v_disallowed text[];
  v_id uuid;
begin
  select pm.role into v_role
  from project_members pm
  where pm.project_id = p_project_id and pm.user_id = auth.uid() and pm.status = 'accepted';

  if v_role is null and exists (select 1 from projects p where p.id = p_project_id and p.owner_id = auth.uid()) then
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

create or replace function revoke_api_token(p_token_id uuid)
returns void as $$
declare
  v_project_id uuid;
begin
  select t.project_id into v_project_id from api_tokens t where t.id = p_token_id and t.revoked_at is null;

  if v_project_id is null then
    raise exception 'token not found or already revoked';
  end if;

  update api_tokens
  set revoked_at = now(), updated_at = now()
  where api_tokens.id = p_token_id
    and (api_tokens.created_by = auth.uid() or is_project_manager(v_project_id));

  if not found then
    raise exception 'not permitted to revoke this token';
  end if;
end;
$$ language plpgsql security definer set search_path = public;
