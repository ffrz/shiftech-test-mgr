update automation_jobs
set status = 'queued', runner_id = null, started_at = null, finished_at = null, error_message = null
where status = 'failed'
  and id = (select id from automation_jobs order by created_at desc limit 1);
