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
