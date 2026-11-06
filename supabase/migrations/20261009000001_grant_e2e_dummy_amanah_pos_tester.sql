-- Give the E2E/automation bot (e2e.dummy@testify.local) tester access to the
-- amanah-pos project so an agent can read its test plans and record test results.
-- Guarded: aborts (listing candidates) unless exactly one project matches.
do $$
declare
  v_project_id uuid;
  v_user_id uuid;
  v_count int;
  v_candidates text;
begin
  -- Prefer an exact "amanah-pos" / "amanah pos" name match.
  select count(*) into v_count from projects
   where lower(trim(name)) in ('amanah-pos', 'amanah pos', 'amanahpos');

  if v_count = 1 then
    select id into v_project_id from projects
     where lower(trim(name)) in ('amanah-pos', 'amanah pos', 'amanahpos');
  else
    select string_agg(format('%s | %s | %s plans | %s', p.id, p.name, coalesce(tp.c, 0), p.status), E'\n')
      into v_candidates
      from projects p
      left join (select project_id, count(*) c from test_plans group by project_id) tp on tp.project_id = p.id
     where p.name ilike '%amanah%';
    raise exception E'No unique exact match for amanah-pos. Candidates:\n%', v_candidates;
  end if;

  select id into v_user_id from users where email = 'e2e.dummy@testify.local';
  if v_user_id is null then
    raise exception 'e2e.dummy user not found';
  end if;

  insert into project_members (project_id, user_id, role, status, invited_by, invited_at, responded_at)
  select v_project_id, v_user_id, 'tester', 'accepted', p.owner_id, now(), now()
  from projects p where p.id = v_project_id
  on conflict do nothing;
end $$;
