create or replace view public.pilot_aggregate_results
with (security_invoker=true)
as
select program_id,campus,category,status,count(*)::bigint as report_count
from public.pilot_reports
group by program_id,campus,category,status;
revoke all on public.pilot_aggregate_results from public,anon;
grant select on public.pilot_aggregate_results to authenticated;