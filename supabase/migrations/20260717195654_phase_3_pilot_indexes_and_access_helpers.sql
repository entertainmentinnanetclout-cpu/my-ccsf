alter table public.pilot_sessions alter column expires_at set default (now() + interval '24 hours');

create index if not exists idx_pilot_programs_status_dates on public.pilot_programs(status, starts_at, ends_at);
create index if not exists idx_pilot_programs_eligible_campuses on public.pilot_programs using gin(eligible_campuses);
create index if not exists idx_pilot_scenarios_program_order on public.pilot_scenarios(program_id, is_active, display_order);
create index if not exists idx_pilot_participants_program_status on public.pilot_participants(program_id, status);
create index if not exists idx_pilot_participants_user on public.pilot_participants(user_id, program_id);
create index if not exists idx_pilot_participants_campus on public.pilot_participants(campus, program_id, status);
create index if not exists idx_pilot_sessions_program_status on public.pilot_sessions(program_id, status);
create index if not exists idx_pilot_sessions_user_status on public.pilot_sessions(user_id, status, last_activity_at desc);
create index if not exists idx_pilot_sessions_campus on public.pilot_sessions(campus, program_id, status);
create index if not exists idx_pilot_sessions_expires on public.pilot_sessions(expires_at) where status='in_progress';
create index if not exists idx_pilot_reports_program_status on public.pilot_reports(program_id, status, submitted_at desc);
create index if not exists idx_pilot_reports_session on public.pilot_reports(session_id, submitted_at desc);
create index if not exists idx_pilot_reports_participant on public.pilot_reports(participant_id, submitted_at desc);
create index if not exists idx_pilot_reports_submitter on public.pilot_reports(submitted_by, submitted_at desc);
create index if not exists idx_pilot_reports_campus_status on public.pilot_reports(campus, status, submitted_at desc);
create index if not exists idx_pilot_reports_assigned on public.pilot_reports(assigned_to, status) where assigned_to is not null;
create index if not exists idx_pilot_report_events_report_time on public.pilot_report_events(report_id, created_at);
create index if not exists idx_pilot_report_events_program on public.pilot_report_events(program_id, created_at desc);
create index if not exists idx_pilot_location_events_report_time on public.pilot_location_events(report_id, captured_at);
create index if not exists idx_pilot_location_events_session_time on public.pilot_location_events(session_id, captured_at);
create index if not exists idx_pilot_attachments_report on public.pilot_attachments(report_id, created_at);
create index if not exists idx_pilot_notifications_user_unread on public.pilot_notifications(user_id, is_read, created_at desc);
create index if not exists idx_pilot_notifications_report on public.pilot_notifications(report_id, created_at desc) where report_id is not null;
create index if not exists idx_pilot_feature_tests_session_feature on public.pilot_feature_tests(session_id, feature_key, created_at);
create index if not exists idx_pilot_feature_tests_program_outcome on public.pilot_feature_tests(program_id, outcome);
create index if not exists idx_pilot_feedback_program on public.pilot_feedback(program_id, created_at desc);
create index if not exists idx_pilot_audit_logs_program_time on public.pilot_audit_logs(program_id, created_at desc);
create index if not exists idx_pilot_audit_logs_actor_time on public.pilot_audit_logs(actor_id, created_at desc);
create index if not exists idx_pilot_audit_logs_campus_time on public.pilot_audit_logs(actor_campus, created_at desc) where actor_campus is not null;

create or replace function private.pilot_actor_role(p_user_id uuid)
returns public.user_role
language sql stable security definer
set search_path=public,private
as $$
  select case
    when private.raw_has_role(p_user_id,'admin'::public.user_role) then 'admin'::public.user_role
    when private.raw_has_role(p_user_id,'security'::public.user_role) then 'security'::public.user_role
    else 'student'::public.user_role
  end
$$;

create or replace function private.pilot_is_super_admin(p_user_id uuid)
returns boolean language sql stable security definer set search_path=public,private
as $$ select coalesce(private.raw_has_role(p_user_id,'admin'::public.user_role),false) $$;

create or replace function private.pilot_is_security(p_user_id uuid)
returns boolean language sql stable security definer set search_path=public,private
as $$ select coalesce(private.raw_has_role(p_user_id,'security'::public.user_role),false) $$;

create or replace function private.pilot_is_head(p_user_id uuid)
returns boolean language sql stable security definer set search_path=public,private
as $$ select coalesce(private.raw_is_head_admin(p_user_id),false) $$;

create or replace function private.pilot_user_campus(p_user_id uuid)
returns public.campus_location language sql stable security definer set search_path=public,private
as $$ select private.raw_get_user_campus(p_user_id) $$;

create or replace function private.pilot_can_access_campus(p_user_id uuid, p_campus public.campus_location)
returns boolean language sql stable security definer set search_path=public,private
as $$
  select private.pilot_is_super_admin(p_user_id)
      or (private.pilot_is_security(p_user_id) and private.pilot_user_campus(p_user_id)=p_campus)
$$;

create or replace function private.pilot_is_active_participant(p_program_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path=public,private
as $$
  select exists(
    select 1
    from public.pilot_participants pp
    join public.pilot_programs pg on pg.id=pp.program_id
    where pp.program_id=p_program_id
      and pp.user_id=p_user_id
      and pp.status in ('consented','active')
      and pg.status='active'
      and (pg.starts_at is null or pg.starts_at<=now())
      and (pg.ends_at is null or pg.ends_at>=now())
      and pp.campus=any(pg.eligible_campuses)
  )
$$;

create or replace function private.pilot_can_access_program(p_user_id uuid, p_program_id uuid)
returns boolean language sql stable security definer set search_path=public,private
as $$
  select private.pilot_is_super_admin(p_user_id)
      or exists(
        select 1 from public.pilot_programs pg
        where pg.id=p_program_id
          and private.pilot_is_security(p_user_id)
          and private.pilot_user_campus(p_user_id)=any(pg.eligible_campuses)
      )
      or exists(
        select 1 from public.pilot_participants pp
        where pp.program_id=p_program_id and pp.user_id=p_user_id
      )
$$;

create or replace function private.pilot_owns_session(p_user_id uuid, p_session_id uuid)
returns boolean language sql stable security definer set search_path=public,private
as $$ select exists(select 1 from public.pilot_sessions ps where ps.id=p_session_id and ps.user_id=p_user_id) $$;

create or replace function private.pilot_owns_report(p_user_id uuid, p_report_id uuid)
returns boolean language sql stable security definer set search_path=public,private
as $$ select exists(select 1 from public.pilot_reports pr where pr.id=p_report_id and pr.submitted_by=p_user_id) $$;

create or replace function private.pilot_can_access_report(p_user_id uuid, p_report_id uuid)
returns boolean language sql stable security definer set search_path=public,private
as $$
  select exists(
    select 1 from public.pilot_reports pr
    where pr.id=p_report_id
      and (
        pr.submitted_by=p_user_id
        or private.pilot_is_super_admin(p_user_id)
        or (private.pilot_is_security(p_user_id) and private.pilot_user_campus(p_user_id)=pr.campus)
      )
  )
$$;

create or replace function private.pilot_can_manage_report(p_user_id uuid, p_report_id uuid)
returns boolean language sql stable security definer set search_path=public,private
as $$
  select exists(
    select 1 from public.pilot_reports pr
    where pr.id=p_report_id
      and (
        private.pilot_is_super_admin(p_user_id)
        or (private.pilot_is_security(p_user_id) and private.pilot_user_campus(p_user_id)=pr.campus)
      )
  )
$$;
