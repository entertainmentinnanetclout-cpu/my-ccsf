-- Phase 2: deterministic student-to-campus reporting and routing evidence.

create or replace function private.pilot_program_is_active_for_campus(
  p_program_id uuid,
  p_campus public.campus_location
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.pilot_programs pg
    where pg.id = p_program_id
      and pg.status = 'active'
      and (pg.starts_at is null or pg.starts_at <= now())
      and (pg.ends_at is null or pg.ends_at >= now())
      and p_campus = any(pg.eligible_campuses)
  )
$$;

create or replace function private.pilot_can_access_report(p_user_id uuid, p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.pilot_reports pr
    join public.pilot_programs pg on pg.id = pr.program_id
    left join public.pilot_participants pp on pp.id = pr.participant_id
    where pr.id = p_report_id
      and pr.deleted_at is null
      and (
        private.pilot_is_super_admin(p_user_id)
        or (
          pr.submitted_by = p_user_id
          and pp.user_id = p_user_id
          and pp.program_id = pr.program_id
          and pp.campus = pr.routing_campus
        )
        or (
          private.pilot_is_security(p_user_id)
          and pr.routing_destination = 'campus_security'
          and private.pilot_user_campus(p_user_id) = pr.routing_campus
          and pr.routing_campus = any(pg.eligible_campuses)
        )
      )
  )
$$;

create or replace function private.pilot_can_manage_report(p_user_id uuid, p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.pilot_reports pr
    join public.pilot_programs pg on pg.id = pr.program_id
    where pr.id = p_report_id
      and pr.deleted_at is null
      and pr.routing_destination = 'campus_security'
      and pr.routing_campus = any(pg.eligible_campuses)
      and pg.status <> 'archived'
      and (
        private.pilot_is_super_admin(p_user_id)
        or (
          private.pilot_is_security(p_user_id)
          and private.pilot_user_campus(p_user_id) = pr.routing_campus
        )
      )
  )
$$;

create or replace function private.pilot_prepare_report()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_session public.pilot_sessions%rowtype;
  v_participant public.pilot_participants%rowtype;
  v_program public.pilot_programs%rowtype;
  v_scenario public.pilot_scenarios%rowtype;
  v_default_notice constant text := 'CONTROLLED PILOT SIMULATION — Routed only to authorised campus-security Pilot staff and super-admin oversight. No emergency service or external agency has been dispatched.';
begin
  select * into v_session
  from public.pilot_sessions
  where id = new.session_id;

  if not found
    or v_session.program_id <> new.program_id
    or v_session.participant_id <> new.participant_id
    or v_session.user_id <> new.submitted_by
    or v_session.campus <> new.campus
    or v_session.status <> 'in_progress'
    or v_session.expires_at <= now()
  then
    raise exception 'Report does not match an active, unexpired Pilot session';
  end if;

  select * into v_program
  from public.pilot_programs
  where id = new.program_id;

  if not found
    or not private.pilot_program_is_active_for_campus(new.program_id, new.campus)
  then
    raise exception 'Pilot programme is not active for the report campus';
  end if;

  select * into v_participant
  from public.pilot_participants
  where id = new.participant_id;

  if not found
    or v_participant.program_id <> new.program_id
    or v_participant.user_id <> new.submitted_by
    or v_participant.campus <> new.campus
    or v_participant.status not in ('consented', 'active')
  then
    raise exception 'Report submitter is not an active participant for this campus';
  end if;

  if new.location_lat is null or new.location_lng is null then
    raise exception 'Every Pilot report requires a captured location';
  end if;

  if new.location_description is null or btrim(new.location_description) = '' then
    raise exception 'Every Pilot report requires a readable location description';
  end if;

  if new.scenario_id is not null then
    select * into v_scenario
    from public.pilot_scenarios
    where id = new.scenario_id
      and program_id = new.program_id
      and is_active = true;

    if not found then
      raise exception 'Scenario is not active for this programme';
    end if;

    if v_scenario.expected_category is not null and v_scenario.expected_category <> new.category then
      raise exception 'Report category does not match the selected Pilot scenario';
    end if;

    new.simulated_severity := v_scenario.simulated_severity;
    new.routing_destination := v_scenario.routing_destination;
    new.simulation_notice := coalesce(nullif(btrim(v_scenario.simulation_notice), ''), v_default_notice);

    if v_scenario.scenario_type = 'emergency_simulation' then
      new.is_anonymous := false;
    end if;
  else
    new.simulated_severity := private.pilot_simulated_severity_for(null, new.category);
    new.routing_destination := 'campus_security';
    new.simulation_notice := v_default_notice;
  end if;

  new.routing_campus := new.campus;

  if new.routing_destination <> 'campus_security' then
    raise exception 'Unsupported Pilot routing destination';
  end if;

  if new.reference_number is null or btrim(new.reference_number) = '' then
    new.reference_number := 'PIL-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;

  new.submitted_at := coalesce(new.submitted_at, now());
  return new;
end
$$;

create or replace function private.pilot_after_report_insert()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_campus_staff_count integer := 0;
  v_super_admin_count integer := 0;
  v_recipient_count integer := 0;
  v_fallback boolean := false;
  v_route_note text;
begin
  select count(distinct ur.user_id)::integer
  into v_campus_staff_count
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.role = 'security'
    and p.campus = new.routing_campus;

  select count(distinct ur.user_id)::integer
  into v_super_admin_count
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.role = 'admin';

  v_recipient_count := v_campus_staff_count + v_super_admin_count;
  v_fallback := v_campus_staff_count = 0;
  v_route_note := case
    when v_fallback then
      'Pilot report routed to super-admin oversight because no campus-security Pilot profile is currently assigned to the routed campus.'
    else
      'Pilot report routed to the authorised campus-security Pilot queue with super-admin oversight.'
  end;

  insert into public.pilot_report_events(
    program_id, report_id, session_id, event_type, to_status,
    actor_id, actor_role, notes, metadata
  )
  values (
    new.program_id, new.id, new.session_id, 'report_created', new.status,
    new.submitted_by, private.pilot_actor_role(new.submitted_by),
    v_route_note,
    jsonb_build_object(
      'simulation_only', true,
      'simulated_severity', new.simulated_severity,
      'routing_destination', new.routing_destination,
      'routing_campus', new.routing_campus,
      'campus_staff_count', v_campus_staff_count,
      'super_admin_count', v_super_admin_count,
      'recipient_count', v_recipient_count,
      'fallback_to_super_admin', v_fallback,
      'external_dispatch', false
    )
  );

  insert into public.pilot_notifications(
    program_id, session_id, report_id, user_id, notification_type,
    title, message, created_by
  )
  values (
    new.program_id, new.session_id, new.id, new.submitted_by, 'report_received',
    'Pilot report received',
    new.simulation_notice || ' Reference: ' || new.reference_number || '.',
    new.submitted_by
  );

  insert into public.pilot_audit_logs(
    program_id, actor_id, actor_role, actor_campus, action,
    entity_type, entity_id, affected_count, metadata
  )
  values (
    new.program_id, new.submitted_by, private.pilot_actor_role(new.submitted_by), new.campus,
    'report_routed_to_campus_queue', 'pilot_report', new.id, greatest(v_recipient_count, 1),
    jsonb_build_object(
      'simulation_only', true,
      'routing_destination', new.routing_destination,
      'routing_campus', new.routing_campus,
      'campus_staff_count', v_campus_staff_count,
      'super_admin_count', v_super_admin_count,
      'fallback_to_super_admin', v_fallback,
      'external_dispatch', false
    )
  );

  return new;
end
$$;

do $$
begin
  alter table public.pilot_reports
    add constraint pilot_reports_coordinates_required
    check (location_lat is not null and location_lng is not null);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.pilot_reports
    add constraint pilot_reports_readable_location_required
    check (location_description is not null and length(btrim(location_description)) > 0);
exception when duplicate_object then null;
end $$;

drop policy if exists pilot_reports_insert on public.pilot_reports;
revoke insert, update, delete on public.pilot_reports from anon, authenticated;
grant select on public.pilot_reports to authenticated;

update public.pilot_report_events e
set notes = case
      when coalesce(route.campus_staff_count, 0) = 0 then
        'Pilot report routed to super-admin oversight because no campus-security Pilot profile is currently assigned to the routed campus.'
      else
        'Pilot report routed to the authorised campus-security Pilot queue with super-admin oversight.'
    end,
    metadata = coalesce(e.metadata, '{}'::jsonb) || jsonb_build_object(
      'simulation_only', true,
      'routing_destination', r.routing_destination,
      'routing_campus', r.routing_campus,
      'simulated_severity', r.simulated_severity,
      'campus_staff_count', coalesce(route.campus_staff_count, 0),
      'super_admin_count', coalesce(route.super_admin_count, 0),
      'recipient_count', coalesce(route.campus_staff_count, 0) + coalesce(route.super_admin_count, 0),
      'fallback_to_super_admin', coalesce(route.campus_staff_count, 0) = 0,
      'external_dispatch', false
    )
from public.pilot_reports r
cross join lateral (
  select
    (
      select count(distinct ur.user_id)::integer
      from public.user_roles ur
      join public.profiles p on p.id = ur.user_id
      where ur.role = 'security' and p.campus = r.routing_campus
    ) as campus_staff_count,
    (
      select count(distinct ur.user_id)::integer
      from public.user_roles ur
      join public.profiles p on p.id = ur.user_id
      where ur.role = 'admin'
    ) as super_admin_count
) route
where e.report_id = r.id
  and e.event_type = 'report_created';

create index if not exists pilot_reports_phase2_queue_idx
  on public.pilot_reports(routing_campus, routing_destination, status, submitted_at desc)
  where deleted_at is null;

comment on function private.pilot_program_is_active_for_campus(uuid, public.campus_location)
  is 'Validates whether a Pilot programme currently accepts new reports for a campus.';
comment on function private.pilot_can_access_report(uuid, uuid)
  is 'Authorises report tracking for the submitting student, routed campus security, or super admin.';
comment on function private.pilot_can_manage_report(uuid, uuid)
  is 'Authorises campus-scoped Pilot case operations without granting production-case access.';