create policy pilot_reports_select on public.pilot_reports for select to authenticated
using (private.pilot_can_access_report((select auth.uid()),id));
create policy pilot_reports_insert on public.pilot_reports for insert to authenticated
with check (
  submitted_by=(select auth.uid())
  and private.pilot_is_active_participant(program_id,(select auth.uid()))
  and exists(select 1 from public.pilot_sessions s where s.id=session_id and s.program_id=pilot_reports.program_id and s.participant_id=pilot_reports.participant_id and s.user_id=(select auth.uid()) and s.campus=pilot_reports.campus and s.status='in_progress')
);

create policy pilot_report_events_select on public.pilot_report_events for select to authenticated
using (private.pilot_can_access_report((select auth.uid()),report_id));

create policy pilot_location_events_select on public.pilot_location_events for select to authenticated
using (private.pilot_can_access_report((select auth.uid()),report_id));
create policy pilot_location_events_insert on public.pilot_location_events for insert to authenticated
with check (user_id=(select auth.uid()) and private.pilot_owns_session((select auth.uid()),session_id) and private.pilot_owns_report((select auth.uid()),report_id));

create policy pilot_attachments_select on public.pilot_attachments for select to authenticated
using (private.pilot_can_access_report((select auth.uid()),report_id));
create policy pilot_attachments_insert on public.pilot_attachments for insert to authenticated
with check (uploaded_by=(select auth.uid()) and private.pilot_owns_session((select auth.uid()),session_id) and private.pilot_owns_report((select auth.uid()),report_id));

create policy pilot_notifications_select on public.pilot_notifications for select to authenticated
using (user_id=(select auth.uid()) or private.pilot_is_super_admin((select auth.uid())) or (report_id is not null and private.pilot_can_manage_report((select auth.uid()),report_id)));
create policy pilot_notifications_update on public.pilot_notifications for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));