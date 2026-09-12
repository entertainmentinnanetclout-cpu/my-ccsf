-- Campus Safety App institutional-readiness governance controls
-- Adds immutable purpose/consent evidence without inventing a TUT retention period.
-- Formal PAIA requests remain routed through TUT's prescribed FORM 2 process.

create table if not exists public.institutional_consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campus public.campus_location,
  feature text not null check (feature in (
    'incident_report',
    'emergency_location',
    'safety_mobility',
    'campus_radar_exact',
    'campus_radar_approximate'
  )),
  action text not null check (action in ('granted','withdrawn','acknowledged')),
  consent_version text not null check (char_length(consent_version) between 3 and 120),
  purpose text not null check (char_length(purpose) between 10 and 1000),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.institutional_consent_events is
'Immutable user consent/acknowledgement evidence for high-risk Campus Safety App features. This is not a substitute for TUT PAIA/POPIA statutory request processes.';

alter table public.institutional_consent_events enable row level security;

drop policy if exists institutional_consent_owner_insert on public.institutional_consent_events;
create policy institutional_consent_owner_insert
on public.institutional_consent_events
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    campus is null
    or campus = public.get_user_campus((select auth.uid()))
  )
);

drop policy if exists institutional_consent_owner_read on public.institutional_consent_events;
create policy institutional_consent_owner_read
on public.institutional_consent_events
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists institutional_consent_super_admin_read on public.institutional_consent_events;
create policy institutional_consent_super_admin_read
on public.institutional_consent_events
for select to authenticated
using (public.is_super_admin((select auth.uid())));

drop policy if exists institutional_consent_campus_admin_read on public.institutional_consent_events;
create policy institutional_consent_campus_admin_read
on public.institutional_consent_events
for select to authenticated
using (
  public.is_campus_admin((select auth.uid()))
  and campus = public.get_user_campus((select auth.uid()))
);

revoke update, delete, truncate on public.institutional_consent_events from anon, authenticated;
grant select, insert on public.institutional_consent_events to authenticated;

create index if not exists institutional_consent_events_user_created_idx
  on public.institutional_consent_events(user_id, created_at desc);
create index if not exists institutional_consent_events_campus_created_idx
  on public.institutional_consent_events(campus, created_at desc)
  where campus is not null;
create index if not exists institutional_consent_events_feature_created_idx
  on public.institutional_consent_events(feature, created_at desc);

-- Track institutional-control status without automating destructive retention
-- before TUT Records Management confirms the authoritative periods.
create table if not exists public.institutional_control_register (
  control_key text primary key,
  control_domain text not null,
  control_title text not null,
  implementation_status text not null check (implementation_status in (
    'implemented',
    'implemented_pending_tut_confirmation',
    'requires_tut_confirmation',
    'planned'
  )),
  evidence_reference text,
  institutional_owner text,
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.institutional_control_register enable row level security;

drop policy if exists institutional_control_register_authenticated_read on public.institutional_control_register;
create policy institutional_control_register_authenticated_read
on public.institutional_control_register
for select to authenticated
using (true);

drop policy if exists institutional_control_register_admin_write on public.institutional_control_register;
create policy institutional_control_register_admin_write
on public.institutional_control_register
for all to authenticated
using (public.is_super_admin((select auth.uid())))
with check (public.is_super_admin((select auth.uid())));

revoke all on public.institutional_control_register from anon;
grant select on public.institutional_control_register to authenticated;

insert into public.institutional_control_register
(control_key, control_domain, control_title, implementation_status, evidence_reference, institutional_owner, notes)
values
  ('paia-route','PAIA','Official PAIA FORM 2 route exposed to users','implemented','/governance','TUT Information Officer','The app does not claim to replace the statutory PAIA process.'),
  ('privacy-rights','POPIA','Access, correction, complaint and consent-withdrawal routes exposed','implemented','/governance','TUT Deputy Information Officer','Uses the published TUT privacy/POPIA route.'),
  ('purpose-minimisation','POPIA','Purpose and data-category notices','implemented','/governance','CCSF / CPS + TUT Privacy','Operational wording remains subject to institutional review.'),
  ('consent-audit','POPIA','Immutable consent evidence for high-risk features','implemented_pending_tut_confirmation','institutional_consent_events','TUT Privacy / Information Security','Retention period remains subject to Records Management approval.'),
  ('role-campus-boundary','Information Security','Backend role and campus access controls','implemented','RLS / server functions','TUT ICT / Information Security','Existing institutional hardening controls remain in force.'),
  ('evidence-protection','Information Security','Private evidence storage and controlled access','implemented','incident-media / secure evidence access','TUT ICT / CPS','Evidence lifecycle retention remains subject to Records Management.'),
  ('retention-periods','Records Management','Authoritative retention schedule','requires_tut_confirmation',null,'TUT Records Management','No destructive automated retention period is invented by this release.'),
  ('cloud-operator-approval','Third-party / cloud','Supabase and Vercel institutional approval and operator terms','requires_tut_confirmation','/governance','TUT ICT / Legal / Privacy','Includes POPIA transborder-flow assessment where applicable.'),
  ('cyber-plan-integration','Cybersecurity','Alignment to internal Cyber Security Plan and Data Incident Plan','requires_tut_confirmation',null,'TUT Information Security','Public PAIA Manual confirms these plans exist; internal control detail is not assumed.'),
  ('backup-dr','Resilience','Backup, restore and disaster-recovery acceptance criteria','requires_tut_confirmation',null,'TUT ICT','Provider capability must be mapped to TUT-approved RPO/RTO and restore evidence.')
on conflict (control_key) do update set
  control_domain = excluded.control_domain,
  control_title = excluded.control_title,
  implementation_status = excluded.implementation_status,
  evidence_reference = excluded.evidence_reference,
  institutional_owner = excluded.institutional_owner,
  notes = excluded.notes,
  updated_at = now();

create or replace function public.record_institutional_consent(
  p_feature text,
  p_action text,
  p_consent_version text,
  p_purpose text,
  p_context jsonb default '{}'::jsonb
) returns public.institutional_consent_events
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_row public.institutional_consent_events;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  insert into public.institutional_consent_events(
    user_id, campus, feature, action, consent_version, purpose, context
  ) values (
    v_user,
    public.get_user_campus(v_user),
    p_feature,
    p_action,
    p_consent_version,
    p_purpose,
    coalesce(p_context, '{}'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.record_institutional_consent(text,text,text,text,jsonb) from public, anon;
grant execute on function public.record_institutional_consent(text,text,text,text,jsonb) to authenticated;


-- ---------------------------------------------------------------------------
-- Location minimisation hardening
-- Visible Campus Radar sessions must have a finite approved sharing window.
-- This release deliberately avoids an indefinite exact-location state.
-- ---------------------------------------------------------------------------
create or replace function public.safety_set_student_presence(
  p_campus public.campus_location,
  p_visibility text,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_meters double precision default null,
  p_zone_label text default null,
  p_status_message text default null,
  p_sharing_until timestamptz default null,
  p_confirm_exact boolean default false
)
returns public.student_safety_presence
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  presence_row public.student_safety_presence;
  v_campus public.campus_location;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  v_campus := public.get_user_campus(auth.uid());
  if v_campus is null then raise exception 'A verified campus profile is required'; end if;
  if p_campus is distinct from v_campus then raise exception 'Campus scope mismatch'; end if;
  if p_visibility not in ('off', 'campus_approximate', 'campus_exact') then raise exception 'Unsupported visibility'; end if;
  if p_visibility = 'campus_exact' and not p_confirm_exact then raise exception 'Exact-location consent is required'; end if;
  if (p_latitude is null) <> (p_longitude is null) then raise exception 'Latitude and longitude must be supplied together'; end if;

  if p_visibility <> 'off' then
    if p_sharing_until is null then raise exception 'A finite Radar sharing period is required'; end if;
    if p_sharing_until <= now() then raise exception 'Radar sharing period has already expired'; end if;
    if p_sharing_until > now() + interval '24 hours' then raise exception 'Radar sharing may not exceed 24 hours'; end if;
  end if;

  insert into public.student_safety_presence (
    user_id, campus, visibility, latitude, longitude, accuracy_meters,
    zone_label, status_message, sharing_until, exact_location_consent_at, last_seen_at
  ) values (
    auth.uid(), v_campus, p_visibility,
    case when p_visibility = 'off' then null else p_latitude end,
    case when p_visibility = 'off' then null else p_longitude end,
    case when p_visibility = 'off' then null else p_accuracy_meters end,
    case when p_visibility = 'off' then null else nullif(btrim(p_zone_label), '') end,
    case when p_visibility = 'off' then null else nullif(btrim(p_status_message), '') end,
    case when p_visibility = 'off' then null else p_sharing_until end,
    case when p_visibility = 'campus_exact' then now() else null end,
    case when p_visibility = 'off' then null else now() end
  )
  on conflict (user_id) do update set
    campus = excluded.campus,
    visibility = excluded.visibility,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy_meters = excluded.accuracy_meters,
    zone_label = excluded.zone_label,
    status_message = excluded.status_message,
    sharing_until = excluded.sharing_until,
    exact_location_consent_at = excluded.exact_location_consent_at,
    last_seen_at = excluded.last_seen_at,
    updated_at = now()
  returning * into presence_row;

  return presence_row;
end;
$$;

revoke all on function public.safety_set_student_presence(public.campus_location, text, double precision, double precision, double precision, text, text, timestamptz, boolean) from public, anon;
grant execute on function public.safety_set_student_presence(public.campus_location, text, double precision, double precision, double precision, text, text, timestamptz, boolean) to authenticated;


-- ---------------------------------------------------------------------------
-- Fail-closed server-side consent gates
-- UI checkboxes alone are not treated as an institutional control.
-- ---------------------------------------------------------------------------
create or replace function private.latest_institutional_consent_action(
  p_user uuid,
  p_feature text
) returns text
language sql
security definer
stable
set search_path = public, private
as $$
  select e.action
  from public.institutional_consent_events e
  where e.user_id = p_user and e.feature = p_feature
  order by e.created_at desc
  limit 1;
$$;

revoke all on function private.latest_institutional_consent_action(uuid,text) from public, anon, authenticated;

create or replace function private.has_recent_institutional_consent(
  p_user uuid,
  p_feature text,
  p_actions text[],
  p_max_age interval default interval '10 minutes'
) returns boolean
language sql
security definer
stable
set search_path = public, private
as $$
  select exists (
    select 1
    from public.institutional_consent_events e
    where e.user_id = p_user
      and e.feature = p_feature
      and e.action = any(p_actions)
      and e.created_at >= now() - p_max_age
  );
$$;

revoke all on function private.has_recent_institutional_consent(uuid,text,text[],interval) from public, anon, authenticated;

create or replace function public.guard_official_submission_consent()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_user uuid := auth.uid();
begin
  if new.scope <> 'official' then return new; end if;
  if v_user is null then raise exception 'Authentication required'; end if;
  if not private.has_recent_institutional_consent(
    v_user,
    'incident_report',
    array['granted','acknowledged']::text[],
    interval '10 minutes'
  ) then
    raise exception 'A current institutional report notice acknowledgement is required before creating an official submission';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_official_submission_consent() from public, anon, authenticated;

drop trigger if exists evidence_submission_governance_consent on public.evidence_submission_drafts;
create trigger evidence_submission_governance_consent
before insert or update on public.evidence_submission_drafts
for each row execute function public.guard_official_submission_consent();

create or replace function public.guard_incident_creation_consent()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_user uuid := auth.uid();
  v_staff boolean := false;
begin
  if v_user is null then return new; end if;

  v_staff := public.is_super_admin(v_user) or public.is_campus_admin(v_user);
  if v_staff then return new; end if;

  if new.title = 'Emergency safety alert' then
    if not private.has_recent_institutional_consent(
      v_user,
      'emergency_location',
      array['granted']::text[],
      interval '10 minutes'
    ) then
      raise exception 'Current emergency identity/location consent is required';
    end if;
  else
    if not private.has_recent_institutional_consent(
      v_user,
      'incident_report',
      array['granted','acknowledged']::text[],
      interval '10 minutes'
    ) then
      raise exception 'Current incident-report governance acknowledgement is required';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_incident_creation_consent() from public, anon, authenticated;

drop trigger if exists incidents_governance_consent on public.incidents;
create trigger incidents_governance_consent
before insert on public.incidents
for each row execute function public.guard_incident_creation_consent();

create or replace function public.guard_mobility_session_consent()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not private.has_recent_institutional_consent(
    v_user,
    'safety_mobility',
    array['granted']::text[],
    interval '10 minutes'
  ) then
    raise exception 'Current Safety Mobility consent is required';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_mobility_session_consent() from public, anon, authenticated;

drop trigger if exists safety_mobility_governance_consent on public.safety_mobility_sessions;
create trigger safety_mobility_governance_consent
before insert on public.safety_mobility_sessions
for each row execute function public.guard_mobility_session_consent();
