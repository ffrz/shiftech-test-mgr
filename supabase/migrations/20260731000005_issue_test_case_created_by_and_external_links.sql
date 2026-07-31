-- Track who created an issue/test case (author hover card, same pattern as test_plans.created_by),
-- and let test cases carry freeform external links (same shape/column as issues.external_links).
alter table issues add column created_by uuid references users(id) on delete set null;
alter table test_cases add column created_by uuid references users(id) on delete set null;
alter table test_cases add column external_links jsonb not null default '[]'::jsonb;
