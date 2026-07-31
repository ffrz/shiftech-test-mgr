-- Issues can also target a specific app role (e.g. "Admin", "Manager"), same concept and
-- same master list (test_roles) already used by test_cases.target_role_id.
alter table issues add column if not exists target_role_id uuid references test_roles(id) on delete set null;

create index if not exists idx_issues_target_role on issues (target_role_id);
