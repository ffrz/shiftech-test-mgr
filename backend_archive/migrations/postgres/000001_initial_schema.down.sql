-- Reverse of 000001_initial_schema.up.sql (Postgres) — drop children before parents.

drop table if exists test_case_template_item_steps;
drop table if exists test_case_template_items;
drop table if exists test_case_templates;

drop table if exists attachments;
drop table if exists issue_tags;
drop table if exists issue_test_results;
drop table if exists issues;

drop table if exists test_result_steps;
drop table if exists test_results;
drop table if exists test_runs;
drop table if exists test_plan_cases;
drop table if exists test_plans;

drop table if exists test_case_steps;
drop table if exists test_case_tags;
drop table if exists test_cases;

drop table if exists entity_code_sequences;
drop table if exists test_roles;
drop table if exists tags;
drop table if exists modules;
drop table if exists project_members;
drop table if exists projects;

drop table if exists refresh_tokens;
drop table if exists profiles;

drop function if exists set_updated_at();
