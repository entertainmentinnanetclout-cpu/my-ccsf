create policy pilot_feature_tests_select on public.pilot_feature_tests for select to authenticated
using (user_id=(select auth.uid()) or private.pilot_is_super_admin((select auth.uid())) or (private.pilot_is_security((select auth.uid())) and private.pilot_user_campus((select auth.uid()))=(select s.campus from public.pilot_sessions s where s.id=session_id)));
create policy pilot_feature_tests_insert on public.pilot_feature_tests for insert to authenticated
with check (user_id=(select auth.uid()) and private.pilot_owns_session((select auth.uid()),session_id) and (report_id is null or private.pilot_owns_report((select auth.uid()),report_id)));

create policy pilot_feedback_select on public.pilot_feedback for select to authenticated
using (user_id=(select auth.uid()) or private.pilot_is_super_admin((select auth.uid())) or (private.pilot_is_security((select auth.uid())) and private.pilot_user_campus((select auth.uid()))=(select s.campus from public.pilot_sessions s where s.id=session_id)));
create policy pilot_feedback_insert on public.pilot_feedback for insert to authenticated
with check (user_id=(select auth.uid()) and private.pilot_owns_session((select auth.uid()),session_id) and (report_id is null or private.pilot_owns_report((select auth.uid()),report_id)));
create policy pilot_feedback_update on public.pilot_feedback for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

create policy pilot_audit_logs_select on public.pilot_audit_logs for select to authenticated
using (private.pilot_is_super_admin((select auth.uid())) or (private.pilot_is_security((select auth.uid())) and actor_campus=private.pilot_user_campus((select auth.uid()))));