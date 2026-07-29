-- Security-definer RPC that permanently deletes the current user's account and all owned
-- data, then anonymises the users/profiles rows with a _DELETED_TIMESTAMP suffix so unique
-- constraints never block re-signup.
--
-- What gets deleted (owned by auth.uid()):
--   - projects (cascades: modules, tags, test_roles, test_cases, test_case_steps,
--     test_case_tags, test_plans, test_plan_cases, test_runs, test_results,
--     test_result_steps, issues, issue_test_results, attachments, project_members)
--   - test_suites (cascades: test_suite_items, test_suite_item_steps)
--   - notifications
--
-- What gets kept (contributions to OTHER people's projects):
--   - test_results.tester_id → set to null
--   - issues.assigned_to → set to null
--   - project_members         → deleted (membership revoked)
--
-- What gets anonymised:
--   - profiles.username → 'deleted_<unix_ts>'
--   - users.email       → 'deleted_<unix_ts>@deleted.local'
--   - users.deleted_at  → now()

create or replace function delete_account()
returns void as $$
declare
  v_user_id uuid := auth.uid();
  v_ts text;
begin
  v_ts := floor(extract(epoch from now()) * 1000)::text;

  delete from projects where owner_id = v_user_id;
  delete from test_suites where owner_id = v_user_id;
  delete from notifications where user_id = v_user_id;

  update test_results set tester_id = null where tester_id = v_user_id;
  update issues set assigned_to = null where assigned_to = v_user_id;
  delete from project_members where user_id = v_user_id;

  update profiles set
    username = 'deleted_' || v_ts,
    display_name = null,
    avatar_url = null,
    bio = null,
    username_changed = false
  where id = v_user_id;

  update users set
    email = 'deleted_' || v_ts || '@deleted.local',
    full_name = null,
    avatar_url = null,
    deleted_at = now()
  where id = v_user_id;
end;
$$ language plpgsql security definer set search_path = public;
