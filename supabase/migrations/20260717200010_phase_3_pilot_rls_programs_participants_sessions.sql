create policy pilot_programs_select on public.pilot_programs for select to authenticated
using (private.pilot_can_access_program((select auth.uid()),id));
create policy pilot_programs_insert on public.pilot_programs for insert to authenticated
with check (private.pilot_is_super_admin((select auth.uid())) and created_by=(select auth.uid()));
create policy pilot_programs_update on public.pilot_programs for update to authenticated
using (private.pilot_is_super_admin((select auth.uid())))
with check (private.pilot_is_super_admin((select auth.uid())));

create policy pilot_scenarios_select on public.pilot_scenarios for select to authenticated
using (private.pilot_can_access_program((select auth.uid()),program_id) and (is_active or private.pilot_is_security((select auth.uid())) or private.pilot_is_super_admin((select auth.uid()))));
create policy pilot_scenarios_insert on public.pilot_scenarios for insert to authenticated
with check (private.pilot_is_super_admin((select auth.uid())) and created_by=(select auth.uid()));
create policy pilot_scenarios_update on public.pilot_scenarios for update to authenticated
using (private.pilot_is_super_admin((select auth.uid())))
with check (private.pilot_is_super_admin((select auth.uid())));

create policy pilot_participants_select on public.pilot_participants for select to authenticated
using (user_id=(select auth.uid()) or private.pilot_is_super_admin((select auth.uid())) or (private.pilot_is_security((select auth.uid())) and private.pilot_user_campus((select auth.uid()))=campus));
create policy pilot_participants_insert on public.pilot_participants for insert to authenticated
with check (private.pilot_is_super_admin((select auth.uid())) and invited_by=(select auth.uid()));
create policy pilot_participants_update on public.pilot_participants for update to authenticated
using (private.pilot_is_super_admin((select auth.uid())))
with check (private.pilot_is_super_admin((select auth.uid())));

create policy pilot_sessions_select on public.pilot_sessions for select to authenticated
using (user_id=(select auth.uid()) or private.pilot_is_super_admin((select auth.uid())) or (private.pilot_is_security((select auth.uid())) and private.pilot_user_campus((select auth.uid()))=campus));
create policy pilot_sessions_insert on public.pilot_sessions for insert to authenticated
with check (
  user_id=(select auth.uid())
  and private.pilot_is_active_participant(program_id,(select auth.uid()))
  and exists(select 1 from public.pilot_participants pp where pp.id=participant_id and pp.program_id=pilot_sessions.program_id and pp.user_id=(select auth.uid()) and pp.campus=pilot_sessions.campus and pp.status in ('consented','active'))
);
create policy pilot_sessions_update on public.pilot_sessions for update to authenticated
using (user_id=(select auth.uid()) or private.pilot_is_super_admin((select auth.uid())) or (private.pilot_is_security((select auth.uid())) and private.pilot_user_campus((select auth.uid()))=campus))
with check (user_id=(select auth.uid()) or private.pilot_is_super_admin((select auth.uid())) or (private.pilot_is_security((select auth.uid())) and private.pilot_user_campus((select auth.uid()))=campus));