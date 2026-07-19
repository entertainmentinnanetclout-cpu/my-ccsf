create or replace function public.pilot_transition_report(p_report_id uuid, p_to_status public.pilot_report_status, p_notes text default null, p_assigned_to uuid default null)
returns public.pilot_reports
language sql security invoker
set search_path=public,pilot_private
as $$ select pilot_private.transition_report(p_report_id,p_to_status,p_notes,p_assigned_to) $$;
revoke all on function pilot_private.transition_report(uuid,public.pilot_report_status,text,uuid) from public, anon;
grant execute on function pilot_private.transition_report(uuid,public.pilot_report_status,text,uuid) to authenticated, service_role;
revoke all on function public.pilot_transition_report(uuid,public.pilot_report_status,text,uuid) from public, anon;
grant execute on function public.pilot_transition_report(uuid,public.pilot_report_status,text,uuid) to authenticated;