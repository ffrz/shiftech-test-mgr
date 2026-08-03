-- Requeue the manually-seeded smoke-test job (20260803030000) so it can be
-- retried after fixing the Windows path-separator bug in
-- runner/src/localRepository.ts (git rev-parse --show-toplevel returns
-- forward slashes even on Windows, but fs.realpath returns backslashes,
-- so the repo-root comparison always failed there before the fix).
update automation_jobs
set status = 'queued', runner_id = null, started_at = null, finished_at = null, error_message = null
where status = 'failed'
  and id = (select id from automation_jobs order by created_at desc limit 1);
