-- CCSF developer control plane: access defaults, MFA-aware authority, campus controls,
-- scheduled maintenance, cohorts, security telemetry and release markers.

alter table public.user_access alter column status set default 'approved';
alter table public.user_access drop constraint if exists user_access_status_check;
alter table public.user_access add constraint user_access_status_check
  check (status in ('pending','approved','suspended','blocked','quarantined'));

update public.user_access
set status = 'approved',
    approved_at = coalesce(approved_at, now()),
    reason = null,
    updated_at = now()
where status = 'pending';

create or replace function public.ensure_new_user_access()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.user_access (user_id, status, approved_at)
  values (new.id, 'approved', now())
  on conflict (user_id) do update
  set status = case
        when public.user_access.status in ('blocked','suspended','quarantined') then public.user_access.status
        else 'approved'
      end,
      approved_at = case
        when public.user_access.status in ('blocked','suspended','quarantined') then public.user_access.approved_at
        else coalesce(public.user_access.approved_at, now())
      end,
      updated_at = now();
  return new;
end;
$$;

insert into public.developer_access (user_id, is_owner, permissions, created_by)
select u.id,
       true,
       '{"system":true,"users":true,"sessions":true,"features":true,"health":true,"audit":true,"security":true,"release":true}'::jsonb,
       u.id
from auth.users u
where lower(u.email) = 'reskonnect@gmail.com'
on conflict (user_id) do update
set is_owner = true,
    permissions = excluded.permissions,
    updated_at = now();

update public.runtime_controls
set config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
      'approval_required', false,
      'developer_mfa_required', true,
      'developer_ip_allowlist_enabled', false,
      'reauth_window_minutes', 10,
      'developer_contact', 'Dubea@tut.ac.za'
    ),
    updated_at = now()
where key = 'system';

create or replace function public.is_developer_aal2(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select check_user_id is not null
    and public.is_developer(check_user_id)
    and check_user_id = auth.uid()
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;
revoke all on function public.is_developer_aal2(uuid) from public, anon;
grant execute on function public.is_developer_aal2(uuid) to authenticated, service_role;

create table if not exists public.campus_runtime_controls (
  campus public.campus_location primary key,
  mode text not null default 'live' check (mode in ('live','read_only','maintenance','locked')),
  message text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.campus_runtime_controls (campus)
select e.enumlabel::public.campus_location
from pg_type t
join pg_enum e on e.enumtypid = t.oid
where t.typname = 'campus_location'
on conflict (campus) do nothing;

create table if not exists public.maintenance_windows (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global','campus','module')),
  campus public.campus_location,
  module_key text,
  mode text not null check (mode in ('read_only','maintenance','locked')),
  message text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (
    (scope = 'global' and campus is null and module_key is null) or
    (scope = 'campus' and campus is not null and module_key is null) or
    (scope = 'module' and module_key is not null)
  )
);
create index if not exists idx_maintenance_windows_active
  on public.maintenance_windows(active, starts_at, ends_at);

create table if not exists public.developer_ip_allowlist (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references auth.users(id) on delete cascade,
  network cidr not null,
  label text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (developer_id, network)
);

create table if not exists public.developer_reauth_sessions (
  session_id uuid primary key,
  developer_id uuid not null references auth.users(id) on delete cascade,
  reauthenticated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ip_address inet,
  created_at timestamptz not null default now()
);
create index if not exists idx_developer_reauth_expires
  on public.developer_reauth_sessions(expires_at);

create table if not exists public.feature_flag_rules (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null references public.feature_flags(key) on delete cascade,
  enabled boolean not null,
  rollout_percent numeric(5,2) check (rollout_percent is null or (rollout_percent >= 0 and rollout_percent <= 100)),
  campuses public.campus_location[] not null default '{}'::public.campus_location[],
  roles text[] not null default '{}'::text[],
  user_ids uuid[] not null default '{}'::uuid[],
  starts_at timestamptz,
  ends_at timestamptz,
  priority integer not null default 100,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index if not exists idx_feature_flag_rules_feature
  on public.feature_flag_rules(feature_key, priority desc, created_at desc);

create table if not exists public.security_anomalies (
  id bigint generated by default as identity primary key,
  rule_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  auth_session_id uuid,
  ip_address inet,
  severity text not null default 'warning' check (severity in ('info','warning','error','critical')),
  title text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','acknowledged','resolved','dismissed')),
  acknowledged_by uuid references auth.users(id) on delete set null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_security_anomalies_open
  on public.security_anomalies(status, created_at desc);
create index if not exists idx_security_anomalies_user
  on public.security_anomalies(user_id, created_at desc);

create table if not exists public.developer_alert_rules (
  rule_key text primary key,
  enabled boolean not null default true,
  threshold numeric not null default 1,
  window_minutes integer not null default 15 check (window_minutes between 1 and 10080),
  severity text not null default 'warning' check (severity in ('info','warning','error','critical')),
  config jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.developer_alert_rules (rule_key, threshold, window_minutes, severity, config) values
  ('critical_client_error', 1, 5, 'critical', '{"event_severity":"critical"}'::jsonb),
  ('client_error_burst', 10, 15, 'error', '{"event_severity":"error"}'::jsonb),
  ('rapid_ip_switching', 3, 30, 'warning', '{}'::jsonb),
  ('excessive_sessions', 6, 60, 'warning', '{}'::jsonb),
  ('suspicious_device_changes', 4, 1440, 'warning', '{}'::jsonb),
  ('repeated_access_denials', 5, 15, 'error', '{}'::jsonb),
  ('impossible_travel', 1, 120, 'error', '{}'::jsonb)
on conflict (rule_key) do nothing;

create table if not exists public.developer_alerts (
  id bigint generated by default as identity primary key,
  rule_key text not null,
  severity text not null default 'warning' check (severity in ('info','warning','error','critical')),
  title text not null,
  message text not null,
  user_id uuid references auth.users(id) on delete set null,
  auth_session_id uuid,
  ip_address inet,
  details jsonb not null default '{}'::jsonb,
  acknowledged_by uuid references auth.users(id) on delete set null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_developer_alerts_unacknowledged
  on public.developer_alerts(acknowledged_at, created_at desc);

create table if not exists public.release_markers (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('release','rollback','backup_verification','checkpoint')),
  version text,
  git_sha text,
  branch text,
  deployment_url text,
  provider_state text,
  migration_version text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_release_markers_created
  on public.release_markers(created_at desc);

alter table public.device_registry add column if not exists country_code text;
alter table public.device_registry add column if not exists region text;
alter table public.device_registry add column if not exists city text;
alter table public.runtime_events add column if not exists ip_address inet;
alter table public.runtime_events add column if not exists edge_function text;

alter table public.campus_runtime_controls enable row level security;
alter table public.maintenance_windows enable row level security;
alter table public.developer_ip_allowlist enable row level security;
alter table public.developer_reauth_sessions enable row level security;
alter table public.feature_flag_rules enable row level security;
alter table public.security_anomalies enable row level security;
alter table public.developer_alert_rules enable row level security;
alter table public.developer_alerts enable row level security;
alter table public.release_markers enable row level security;

revoke all on public.campus_runtime_controls, public.maintenance_windows,
  public.developer_ip_allowlist, public.developer_reauth_sessions,
  public.feature_flag_rules, public.security_anomalies,
  public.developer_alert_rules, public.developer_alerts,
  public.release_markers from anon, authenticated;
grant all on public.campus_runtime_controls, public.maintenance_windows,
  public.developer_ip_allowlist, public.developer_reauth_sessions,
  public.feature_flag_rules, public.security_anomalies,
  public.developer_alert_rules, public.developer_alerts,
  public.release_markers to service_role;

drop policy if exists "Developer owner can insert developer access" on public.developer_access;
create policy "Developer owner can insert developer access"
  on public.developer_access for insert to authenticated
  with check (public.is_developer_owner(auth.uid()) and public.is_developer_aal2(auth.uid()));
drop policy if exists "Developer owner can update developer access" on public.developer_access;
create policy "Developer owner can update developer access"
  on public.developer_access for update to authenticated
  using (public.is_developer_owner(auth.uid()) and public.is_developer_aal2(auth.uid()))
  with check (public.is_developer_owner(auth.uid()) and public.is_developer_aal2(auth.uid()));
drop policy if exists "Developer owner can delete developer access" on public.developer_access;
create policy "Developer owner can delete developer access"
  on public.developer_access for delete to authenticated
  using (public.is_developer_owner(auth.uid()) and public.is_developer_aal2(auth.uid()) and user_id <> auth.uid());

drop policy if exists "Developers manage user access" on public.user_access;
create policy "Developers manage user access"
  on public.user_access for all to authenticated
  using (public.is_developer_aal2(auth.uid()))
  with check (public.is_developer_aal2(auth.uid()));
drop policy if exists "Developers manage runtime controls" on public.runtime_controls;
create policy "Developers manage runtime controls"
  on public.runtime_controls for all to authenticated
  using (public.is_developer_aal2(auth.uid()))
  with check (public.is_developer_aal2(auth.uid()));
drop policy if exists "Developers manage access restrictions" on public.access_restrictions;
create policy "Developers manage access restrictions"
  on public.access_restrictions for all to authenticated
  using (public.is_developer_aal2(auth.uid()))
  with check (public.is_developer_aal2(auth.uid()));
drop policy if exists "Developers manage feature flags" on public.feature_flags;
create policy "Developers manage feature flags"
  on public.feature_flags for all to authenticated
  using (public.is_developer_aal2(auth.uid()))
  with check (public.is_developer_aal2(auth.uid()));
drop policy if exists "Developers manage feature overrides" on public.feature_flag_overrides;
create policy "Developers manage feature overrides"
  on public.feature_flag_overrides for all to authenticated
  using (public.is_developer_aal2(auth.uid()))
  with check (public.is_developer_aal2(auth.uid()));

insert into public.feature_flags (key, description, enabled) values
  ('report_incident','Student incident-report intake',true),
  ('evidence','Evidence and attachment uploads',true),
  ('radar','Campus Safety Radar',true),
  ('mobility','In-Transit, Night Travel and Track This Phone',true),
  ('community','Community games, roles and media',true),
  ('sport','Community sports and tournaments',true),
  ('judiciary','Judiciary workspace',true),
  ('chat','Student/support chat',true),
  ('notifications','In-app and push notifications',true),
  ('admin_portal','Super Admin portal',true),
  ('cps_portal','Campus Protection / Security portal',true)
on conflict (key) do update set description = excluded.description;

create or replace function public.effective_feature_enabled(p_feature_key text, p_user_id uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_base boolean := true;
  v_override boolean;
  v_campus public.campus_location;
  v_roles text[] := '{}'::text[];
  v_rule record;
  v_bucket integer;
begin
  select f.enabled into v_base from public.feature_flags f where f.key = p_feature_key;
  v_base := coalesce(v_base, true);
  if p_user_id is null then return v_base; end if;

  select o.enabled into v_override
  from public.feature_flag_overrides o
  where o.feature_key = p_feature_key and o.user_id = p_user_id;
  if found then return v_override; end if;

  select p.campus into v_campus from public.profiles p where p.id = p_user_id;
  select coalesce(array_agg(distinct ur.role::text), '{}'::text[])
    into v_roles from public.user_roles ur where ur.user_id = p_user_id;
  v_bucket := abs(hashtextextended(p_user_id::text || ':' || p_feature_key, 0) % 10000)::integer;

  select r.* into v_rule
  from public.feature_flag_rules r
  where r.feature_key = p_feature_key
    and (r.starts_at is null or r.starts_at <= now())
    and (r.ends_at is null or r.ends_at > now())
    and (coalesce(array_length(r.campuses, 1), 0) = 0 or v_campus = any(r.campuses))
    and (coalesce(array_length(r.roles, 1), 0) = 0 or v_roles && r.roles)
    and (coalesce(array_length(r.user_ids, 1), 0) = 0 or p_user_id = any(r.user_ids))
    and (r.rollout_percent is null or v_bucket < round(r.rollout_percent * 100)::integer)
  order by r.priority desc, r.created_at desc
  limit 1;
  if found then return v_rule.enabled; end if;
  return v_base;
end;
$$;
revoke all on function public.effective_feature_enabled(text, uuid) from public, anon;
grant execute on function public.effective_feature_enabled(text, uuid) to authenticated, service_role;
