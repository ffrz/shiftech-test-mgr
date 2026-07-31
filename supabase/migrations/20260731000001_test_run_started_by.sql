-- Track who started a test run, so the run detail page can show/hover the runner's identity.
alter table test_runs add column started_by uuid references users(id) on delete set null;
