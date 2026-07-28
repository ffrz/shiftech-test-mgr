do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'project_members'
  ) then
    execute 'alter publication supabase_realtime add table project_members';
  end if;
end $$;
