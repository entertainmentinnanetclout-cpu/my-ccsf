do $$
begin
  create type public.pilot_simulated_severity as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.pilot_routing_destination as enum ('campus_security');
exception when duplicate_object then null;
end $$;

alter table public.pilot_scenarios
  add column if not exists simulated_severity public.pilot_simulated_severity not null default 'medium',
  add column if not exists routing_destination public.pilot_routing_destination not null default 'campus_security',
  add column if not exists simulation_notice text not null default 'CONTROLLED PILOT SIMULATION — No emergency service or external agency has been dispatched.';

alter table public.pilot_reports
  add column if not exists simulated_severity public.pilot_simulated_severity not null default 'medium',
  add column if not exists routing_destination public.pilot_routing_destination not null default 'campus_security',
  add column if not exists routing_campus public.campus_location,
  add column if not exists simulation_notice text not null default 'CONTROLLED PILOT SIMULATION — No emergency service or external agency has been dispatched.';

update public.pilot_reports
set routing_campus = campus
where routing_campus is null;

alter table public.pilot_reports
  alter column routing_campus set not null;

do $$
begin
  alter table public.pilot_reports
    add constraint pilot_reports_routing_campus_matches_campus check (routing_campus = campus);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.pilot_reports
    add constraint pilot_reports_simulation_notice_required check (length(btrim(simulation_notice)) > 0);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.pilot_scenarios
    add constraint pilot_scenarios_simulation_notice_required check (length(btrim(simulation_notice)) > 0);
exception when duplicate_object then null;
end $$;

create or replace function private.pilot_simulated_severity_for(
  p_scenario_type public.pilot_scenario_type,
  p_category public.incident_category
)
returns public.pilot_simulated_severity
language sql
immutable
set search_path = public, private
as $$
  select case
    when p_scenario_type = 'emergency_simulation' then 'critical'::public.pilot_simulated_severity
    when p_category in ('Rape', 'Sexual assault', 'Gbv', 'Murder', 'Attempted murder', 'Armed robbery') then 'critical'::public.pilot_simulated_severity
    when p_category in ('Assault GBH', 'Robbery', 'Arson', 'Public violence') then 'high'::public.pilot_simulated_severity
    when p_scenario_type in ('location_test', 'attachment_test', 'notification_test', 'resource_download') then 'low'::public.pilot_simulated_severity
    else 'medium'::public.pilot_simulated_severity
  end
$$;

update public.pilot_scenarios
set simulated_severity = private.pilot_simulated_severity_for(scenario_type, expected_category),
    routing_destination = 'campus_security',
    simulation_notice = case
      when scenario_type = 'emergency_simulation'
        then 'CRITICAL PILOT SIMULATION — Routed only to authorised campus-security Pilot staff and super-admin oversight. No emergency service or external agency has been dispatched.'
      else 'CONTROLLED PILOT SIMULATION — Routed only to authorised campus-security Pilot staff and super-admin oversight. No emergency service or external agency has been dispatched.'
    end;

update public.pilot_reports pr
set simulated_severity = coalesce(
      (select ps.simulated_severity from public.pilot_scenarios ps where ps.id = pr.scenario_id),
      private.pilot_simulated_severity_for(null, pr.category)
    ),
    routing_destination = 'campus_security',
    routing_campus = pr.campus,
    simulation_notice = coalesce(
      (select ps.simulation_notice from public.pilot_scenarios ps where ps.id = pr.scenario_id),
      'CONTROLLED PILOT SIMULATION — Routed only to authorised campus-security Pilot staff and super-admin oversight. No emergency service or external agency has been dispatched.'
    );

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

create or replace function private.pilot_can_access_program(p_user_id uuid, p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.pilot_is_super_admin(p_user_id)
      or exists (
        select 1
        from public.pilot_programs pg
        where pg.id = p_program_id
          and pg.status = 'active'
          and (pg.starts_at is null or pg.starts_at <= now())
          and (pg.ends_at is null or pg.ends_at >= now())
          and (
            (
              private.pilot_is_security(p_user_id)
              and private.pilot_user_campus(p_user_id) = any(pg.eligible_campuses)
            )
            or exists (
              select 1
              from public.pilot_participants pp
              where pp.program_id = pg.id
                and pp.user_id = p_user_id
                and pp.status in ('invited', 'consented', 'active', 'completed')
                and pp.campus = any(pg.eligible_campuses)
            )
          )
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
          and pp.status in ('consented', 'active', 'completed')
          and pg.status = 'active'
          and (pg.starts_at is null or pg.starts_at <= now())
          and (pg.ends_at is null or pg.ends_at >= now())
          and pr.routing_campus = any(pg.eligible_campuses)
        )
        or (
          private.pilot_is_security(p_user_id)
          and pr.routing_destination = 'campus_security'
          and private.pilot_user_campus(p_user_id) = pr.routing_campus
          and pg.status = 'active'
          and (pg.starts_at is null or pg.starts_at <= now())
          and (pg.ends_at is null or pg.ends_at >= now())
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
      and pg.status = 'active'
      and (pg.starts_at is null or pg.starts_at <= now())
      and (pg.ends_at is null or pg.ends_at >= now())
      and pr.routing_campus = any(pg.eligible_campuses)
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
  select * into v_session from public.pilot_sessions where id = new.session_id;
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

  select * into v_program from public.pilot_programs where id = new.program_id;
  if not found
    or v_program.status <> 'active'
    or (v_program.starts_at is not null and v_program.starts_at > now())
    or (v_program.ends_at is not null and v_program.ends_at < now())
    or not (new.campus = any(v_program.eligible_campuses))
  then
    raise exception 'Pilot programme is not active for the report campus';
  end if;

  select * into v_participant from public.pilot_participants where id = new.participant_id;
  if not found
    or v_participant.program_id <> new.program_id
    or v_participant.user_id <> new.submitted_by
    or v_participant.campus <> new.campus
    or v_participant.status not in ('consented', 'active')
  then
    raise exception 'Report submitter is not an active participant for this campus';
  end if;

  if new.scenario_id is not null then
    select * into v_scenario
    from public.pilot_scenarios
    where id = new.scenario_id and program_id = new.program_id and is_active = true;
    if not found then raise exception 'Scenario is not active for this programme'; end if;
    if v_scenario.expected_category is not null and v_scenario.expected_category <> new.category then
      raise exception 'Report category does not match the selected Pilot scenario';
    end if;
    if (v_scenario.requires_location or v_scenario.scenario_type = 'emergency_simulation')
      and (new.location_lat is null or new.location_lng is null)
    then
      raise exception 'The selected Pilot scenario requires a captured location';
    end if;
    new.simulated_severity := v_scenario.simulated_severity;
    new.routing_destination := v_scenario.routing_destination;
    new.simulation_notice := coalesce(nullif(btrim(v_scenario.simulation_notice), ''), v_default_notice);
    if v_scenario.scenario_type = 'emergency_simulation' then new.is_anonymous := false; end if;
  else
    new.simulated_severity := private.pilot_simulated_severity_for(null, new.category);
    new.routing_destination := 'campus_security';
    new.simulation_notice := v_default_notice;
  end if;

  new.routing_campus := new.campus;
  if new.routing_destination <> 'campus_security' then raise exception 'Unsupported Pilot routing destination'; end if;
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
begin
  insert into public.pilot_report_events(
    program_id, report_id, session_id, event_type, to_status,
    actor_id, actor_role, notes, metadata
  ) values (
    new.program_id, new.id, new.session_id, 'report_created', new.status,
    new.submitted_by, private.pilot_actor_role(new.submitted_by),
    'Pilot simulation report created and routed to the authorised campus queue.',
    jsonb_build_object(
      'simulation_only', true,
      'simulated_severity', new.simulated_severity,
      'routing_destination', new.routing_destination,
      'routing_campus', new.routing_campus
    )
  );

  insert into public.pilot_notifications(
    program_id, session_id, report_id, user_id, notification_type,
    title, message, created_by
  ) values (
    new.program_id, new.session_id, new.id, new.submitted_by, 'report_received',
    'Pilot report received',
    new.simulation_notice || ' Reference: ' || new.reference_number || '.',
    new.submitted_by
  );
  return new;
end
$$;

drop policy if exists pilot_participants_select on public.pilot_participants;
create policy pilot_participants_select
on public.pilot_participants
for select
to authenticated
using (
  private.pilot_is_super_admin((select auth.uid()))
  or (user_id = (select auth.uid()) and private.pilot_can_access_program((select auth.uid()), program_id))
  or (
    private.pilot_is_security((select auth.uid()))
    and private.pilot_user_campus((select auth.uid())) = campus
    and private.pilot_program_is_active_for_campus(program_id, campus)
  )
);

drop policy if exists pilot_sessions_select on public.pilot_sessions;
create policy pilot_sessions_select
on public.pilot_sessions
for select
to authenticated
using (
  private.pilot_is_super_admin((select auth.uid()))
  or (user_id = (select auth.uid()) and private.pilot_can_access_program((select auth.uid()), program_id))
  or (
    private.pilot_is_security((select auth.uid()))
    and private.pilot_user_campus((select auth.uid())) = campus
    and private.pilot_program_is_active_for_campus(program_id, campus)
  )
);

drop policy if exists pilot_reports_insert on public.pilot_reports;
revoke insert, update, delete on public.pilot_reports from anon, authenticated;
grant select on public.pilot_reports to authenticated;

create index if not exists pilot_reports_routing_queue_idx
  on public.pilot_reports(program_id, routing_campus, routing_destination, status, submitted_at desc)
  where deleted_at is null;

create index if not exists pilot_reports_student_tracker_idx
  on public.pilot_reports(submitted_by, program_id, submitted_at desc)
  where deleted_at is null;

comment on column public.pilot_reports.simulated_severity is 'Simulation-only severity snapshot derived by the server from the selected Pilot scenario and category.';
comment on column public.pilot_reports.routing_destination is 'Pilot-only routing destination. It never represents an external dispatch destination.';
comment on column public.pilot_reports.routing_campus is 'Campus queue that may access this simulated case; always constrained to the report campus.';
comment on column public.pilot_reports.simulation_notice is 'Immutable simulation boundary displayed with the case and student notifications.';