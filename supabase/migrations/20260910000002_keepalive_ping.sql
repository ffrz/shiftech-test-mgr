-- Keep-alive probe for deploy/supabase-keepalive.sh.
-- Supabase free tier pauses projects after 7 days of inactivity. This RPC does a
-- real read against a table (bypassing RLS via security definer) so a successful
-- response proves the request reached Postgres, unlike a select on an
-- RLS-protected table which returns [] for anon. Exposes no row data: only a
-- boolean and server time.

create or replace function ping()
returns jsonb as $$
begin
  perform 1 from projects limit 1;
  return jsonb_build_object('ok', true, 'db_time', now());
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function ping() from public;
grant execute on function ping() to anon, authenticated;
