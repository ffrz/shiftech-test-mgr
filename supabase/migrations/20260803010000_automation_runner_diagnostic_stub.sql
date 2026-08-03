-- Stub for poll_runner_diagnostic. The runner CLI's main loop
-- (runner/src/runner.ts start()) calls this on every poll iteration before
-- poll_automation_job, and treats any RPC failure as a cycle failure — so
-- without this function present, real job polling never runs.
--
-- This repo has no diagnostics table/feature (20260803000000_automation_runner_rpcs.sql
-- intentionally skipped it, no UI or use case defined yet), so this always
-- reports "no diagnostic queued". It still validates the runner token, so
-- an invalid token fails the same way it would with a real implementation.
create or replace function poll_runner_diagnostic(p_token text)
returns jsonb as $$
declare v_runner automation_runners;
begin
  select * into v_runner from automation_runners
  where active and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;

  update automation_runners set last_seen_at = now() where id = v_runner.id;

  return jsonb_build_object('job', null);
end; $$ language plpgsql security definer set search_path = public, extensions;

revoke all on function poll_runner_diagnostic(text) from public;
grant execute on function poll_runner_diagnostic(text) to anon, authenticated;
