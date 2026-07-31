-- Track who created a test plan, so the plan detail page can show/hover the author's identity.
alter table test_plans add column created_by uuid references users(id) on delete set null;
