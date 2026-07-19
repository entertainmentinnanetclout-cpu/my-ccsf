alter table public.pilot_sessions replica identity full;
alter table public.pilot_reports replica identity full;
alter table public.pilot_report_events replica identity full;
alter table public.pilot_notifications replica identity full;
do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='pilot_sessions') then alter publication supabase_realtime add table public.pilot_sessions; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='pilot_reports') then alter publication supabase_realtime add table public.pilot_reports; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='pilot_report_events') then alter publication supabase_realtime add table public.pilot_report_events; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='pilot_notifications') then alter publication supabase_realtime add table public.pilot_notifications; end if;
end $$;