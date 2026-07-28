-- User Management list endpoint with server-side sorting by joined profile columns.
--
-- PostgREST's query-string ordering does not support sorting the parent table
-- (users) by a column from an embedded/related table (profiles). The previous
-- attempts using `profiles.username`, `profiles(username)`, `profiles.order`,
-- `referencedTable`, etc. all fail with PGRST100.
--
-- Fix: use a security-definer SQL function that joins users + profiles in plain
-- SQL, applies filters/search, sorts by any joined column, and returns both the
-- page rows and total count as a single JSON object.

create or replace function list_users(
  p_search text default null,
  p_roles text[] default null,
  p_sort_field text default 'createdAt',
  p_sort_order text default 'desc',
  p_page int default 1,
  p_page_size int default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_offset int;
  v_total int;
  v_sort_sql text;
  v_data jsonb;
begin
  if not is_admin() then
    raise exception 'only admins can list users';
  end if;

  v_offset := (p_page - 1) * p_page_size;

  -- Safe mapping of frontend sort fields to actual SQL identifiers.
  v_sort_sql := case p_sort_field
    when 'email'        then 'u.email'
    when 'role'         then 'u.role'
    when 'createdAt'    then 'u.created_at'
    when '_displayName' then 'p.display_name'
    when '_username'    then 'p.username'
    else 'u.created_at'
  end || ' ' || case lower(p_sort_order)
    when 'asc'  then 'asc'
    else 'desc'
  end || ' nulls last';

  select count(*) into v_total
  from users u
  left join profiles p on p.id = u.id
  where u.deleted_at is null
    and (p_roles is null or u.role = any(p_roles))
    and (
      p_search is null
      or u.email ilike '%' || p_search || '%'
      or p.username ilike '%' || p_search || '%'
      or p.display_name ilike '%' || p_search || '%'
    );

  execute format($dyn$
    select coalesce(jsonb_agg(to_jsonb(u) || jsonb_build_object(
      'profiles', jsonb_build_object(
        'username', p.username,
        'display_name', p.display_name
      )
    ) order by %s), '[]'::jsonb)
    from users u
    left join profiles p on p.id = u.id
    where u.deleted_at is null
      and ($1 is null or u.role = any($1))
      and (
        $2 is null
        or u.email ilike '%%' || coalesce($2, '') || '%%'
        or p.username ilike '%%' || coalesce($2, '') || '%%'
        or p.display_name ilike '%%' || coalesce($2, '') || '%%'
      )
    limit $3 offset $4
  $dyn$, v_sort_sql)
  into v_data
  using p_roles, p_search, p_page_size, v_offset;

  return jsonb_build_object('data', v_data, 'total', v_total);
end;
$$;

grant execute on function list_users(text, text[], text, text, int, int) to authenticated;
