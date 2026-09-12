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
  if p_visibility = 'campus_exact' and private.latest_institutional_consent_action(auth.uid(), 'campus_radar_exact') is distinct from 'granted' then
    raise exception 'Current exact Campus Radar consent is required';
  end if;
  if p_visibility = 'campus_approximate' and private.latest_institutional_consent_action(auth.uid(), 'campus_radar_approximate') is distinct from 'granted' then
    raise exception 'Current approximate Campus Radar consent is required';
  end if;
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
before insert on public.evidence_submission_drafts
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
  elsif new.title in ('In-transit safety alert', 'Night-travel safety alert', 'Device-location safety alert') then
    if private.latest_institutional_consent_action(v_user, 'safety_mobility') is distinct from 'granted' then
      raise exception 'Active Safety Mobility consent is required';
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


-- ---------------------------------------------------------------------------
-- Institutional assurance evidence and auditable protocol extensibility
-- ---------------------------------------------------------------------------
create table if not exists public.institutional_assurance_evidence (
  id uuid primary key default gen_random_uuid(),
  control_key text not null references public.institutional_control_register(control_key) on delete restrict,
  evidence_type text not null check (evidence_type in (
    'approval',
    'assessment',
    'security_test',
    'restore_test',
    'privacy_review',
    'records_review',
    'operator_review',
    'release_gate',
    'training',
    'other'
  )),
  title text not null check (char_length(title) between 3 and 240),
  result text not null default 'pending' check (result in (
    'pending',
    'passed',
    'accepted',
    'failed',
    'conditional',
    'not_applicable'
  )),
  evidence_reference text,
  institutional_owner text,
  performed_at timestamptz,
  expires_at timestamptz,
  notes text,
  supersedes_id uuid references public.institutional_assurance_evidence(id) on delete restrict,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.institutional_assurance_evidence is
'Append-only institutional assurance evidence. Records approvals, tests and reviews without claiming that technical evidence equals TUT approval.';

alter table public.institutional_assurance_evidence enable row level security;

drop policy if exists institutional_assurance_admin_read on public.institutional_assurance_evidence;
create policy institutional_assurance_admin_read
on public.institutional_assurance_evidence
for select to authenticated
using (public.is_super_admin((select auth.uid())));

revoke all on public.institutional_assurance_evidence from anon, authenticated;
grant select on public.institutional_assurance_evidence to authenticated;

create index if not exists institutional_assurance_evidence_control_created_idx
  on public.institutional_assurance_evidence(control_key, created_at desc);
create index if not exists institutional_assurance_evidence_result_idx
  on public.institutional_assurance_evidence(result, created_at desc);

create table if not exists public.institutional_governance_audit (
  id bigint generated by default as identity primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  control_key text,
  evidence_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.institutional_governance_audit enable row level security;

drop policy if exists institutional_governance_audit_admin_read on public.institutional_governance_audit;
create policy institutional_governance_audit_admin_read
on public.institutional_governance_audit
for select to authenticated
using (public.is_super_admin((select auth.uid())));

revoke all on public.institutional_governance_audit from anon, authenticated;
grant select on public.institutional_governance_audit to authenticated;

create index if not exists institutional_governance_audit_created_idx
  on public.institutional_governance_audit(created_at desc);
create index if not exists institutional_governance_audit_control_idx
  on public.institutional_governance_audit(control_key, created_at desc);

-- Direct client mutation is removed; governance changes pass through audited RPCs.
drop policy if exists institutional_control_register_admin_write on public.institutional_control_register;
revoke insert, update, delete, truncate on public.institutional_control_register from authenticated;

create or replace function public.upsert_institutional_control(
  p_control_key text,
  p_control_domain text,
  p_control_title text,
  p_implementation_status text,
  p_evidence_reference text default null,
  p_institutional_owner text default null,
  p_notes text default null
) returns public.institutional_control_register
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_row public.institutional_control_register;
begin
  if v_actor is null or not public.is_super_admin(v_actor) then
    raise exception 'Institutional governance administrator access required';
  end if;
  if p_implementation_status not in (
    'implemented',
    'implemented_pending_tut_confirmation',
    'requires_tut_confirmation',
    'planned'
  ) then
    raise exception 'Unsupported implementation status';
  end if;
  if char_length(btrim(coalesce(p_control_key, ''))) not between 3 and 120 then
    raise exception 'Control key must contain between 3 and 120 characters';
  end if;

  insert into public.institutional_control_register(
    control_key, control_domain, control_title, implementation_status,
    evidence_reference, institutional_owner, notes, updated_at
  ) values (
    lower(regexp_replace(btrim(p_control_key), '[^a-zA-Z0-9_-]+', '-', 'g')),
    left(btrim(p_control_domain), 160),
    left(btrim(p_control_title), 240),
    p_implementation_status,
    nullif(left(btrim(coalesce(p_evidence_reference, '')), 1000), ''),
    nullif(left(btrim(coalesce(p_institutional_owner, '')), 240), ''),
    nullif(left(btrim(coalesce(p_notes, '')), 4000), ''),
    now()
  )
  on conflict (control_key) do update set
    control_domain = excluded.control_domain,
    control_title = excluded.control_title,
    implementation_status = excluded.implementation_status,
    evidence_reference = excluded.evidence_reference,
    institutional_owner = excluded.institutional_owner,
    notes = excluded.notes,
    updated_at = now()
  returning * into v_row;

  insert into public.institutional_governance_audit(actor_id, action, control_key, details)
  values (
    v_actor,
    'control_upserted',
    v_row.control_key,
    jsonb_build_object(
      'implementation_status', v_row.implementation_status,
      'institutional_owner', v_row.institutional_owner
    )
  );

  return v_row;
end;
$$;

revoke all on function public.upsert_institutional_control(text,text,text,text,text,text,text) from public, anon;
grant execute on function public.upsert_institutional_control(text,text,text,text,text,text,text) to authenticated;

create or replace function public.record_institutional_assurance_evidence(
  p_control_key text,
  p_evidence_type text,
  p_title text,
  p_result text default 'pending',
  p_evidence_reference text default null,
  p_institutional_owner text default null,
  p_performed_at timestamptz default null,
  p_expires_at timestamptz default null,
  p_notes text default null,
  p_supersedes_id uuid default null
) returns public.institutional_assurance_evidence
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_row public.institutional_assurance_evidence;
begin
  if v_actor is null or not public.is_super_admin(v_actor) then
    raise exception 'Institutional governance administrator access required';
  end if;
  if not exists (
    select 1 from public.institutional_control_register where control_key = p_control_key
  ) then
    raise exception 'Unknown institutional control';
  end if;

  insert into public.institutional_assurance_evidence(
    control_key, evidence_type, title, result, evidence_reference,
    institutional_owner, performed_at, expires_at, notes, supersedes_id, created_by
  ) values (
    p_control_key,
    p_evidence_type,
    left(btrim(p_title), 240),
    p_result,
    nullif(left(btrim(coalesce(p_evidence_reference, '')), 2000), ''),
    nullif(left(btrim(coalesce(p_institutional_owner, '')), 240), ''),
    p_performed_at,
    p_expires_at,
    nullif(left(btrim(coalesce(p_notes, '')), 4000), ''),
    p_supersedes_id,
    v_actor
  )
  returning * into v_row;

  insert into public.institutional_governance_audit(actor_id, action, control_key, evidence_id, details)
  values (
    v_actor,
    'assurance_evidence_recorded',
    v_row.control_key,
    v_row.id,
    jsonb_build_object(
      'evidence_type', v_row.evidence_type,
      'result', v_row.result,
      'title', v_row.title
    )
  );

  return v_row;
end;
$$;

revoke all on function public.record_institutional_assurance_evidence(text,text,text,text,text,text,timestamptz,timestamptz,text,uuid) from public, anon;
grant execute on function public.record_institutional_assurance_evidence(text,text,text,text,text,text,timestamptz,timestamptz,text,uuid) to authenticated;

insert into public.institutional_control_register
(control_key, control_domain, control_title, implementation_status, evidence_reference, institutional_owner, notes)
values
  ('privileged-mfa','Identity & Access','AAL2 MFA for privileged CPS / admin roles','implemented','PrivilegedMfaGate + Supabase MFA','TUT ICT / Information Security','Privileged portal access fails closed until AAL2 is reached; biometric sign-in does not replace MFA.'),
  ('security-monitoring','Cybersecurity','Security-event logging and monitoring','implemented_pending_tut_confirmation','runtime_events / evidence_access_audit / developer_audit_logs','TUT Information Security','Application monitoring exists; final SIEM integration and escalation thresholds remain subject to the internal Cyber Security Plan.'),
  ('release-change-control','Change Management','Branch, CI, preview, review and controlled merge workflow','implemented','.github/workflows/ci.yml','TUT ICT / Technical owner','Production changes are expected to be reviewable and evidenced before merge and deployment.'),
  ('external-location-processors','Privacy / Third-party','External map and reverse-geocoding services fail closed','implemented_pending_tut_confirmation','VITE_EXTERNAL_MAP_TILES_ENABLED=false; VITE_EXTERNAL_REVERSE_GEOCODING_ENABLED=false','TUT ICT / Privacy','Exact case coordinates are not sent to Google Maps; optional external map/reverse-geocoding services remain disabled until approved.'),
  ('security-assessment','Cybersecurity','Independent or TUT-approved security assessment / penetration test','planned',null,'TUT Information Security','Automated authorization tests support readiness but do not replace any TUT-required independent assessment.')
on conflict (control_key) do update set
  control_domain = excluded.control_domain,
  control_title = excluded.control_title,
  implementation_status = excluded.implementation_status,
  evidence_reference = excluded.evidence_reference,
  institutional_owner = excluded.institutional_owner,
  notes = excluded.notes,
  updated_at = now();
