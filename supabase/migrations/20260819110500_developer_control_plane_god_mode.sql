-- CCSF Developer Control Plane — production enforcement and God Mode controls
-- Adds automatic onboarding approval, AAL2-aware developer authority, campus/runtime
-- kill switches, read-only/quarantine write enforcement, feature cohorts, IP allowlists,
-- security anomalies, alerts, release markers, rate/health RPCs and fresh-MFA tracking.

-- ---------------------------------------------------------------------------
-- 1. Automatic student onboarding + canonical developer owner
-- ---------------------------------------------------------------------------

alter table public.user_access alter column status set default 'approved';
alter table public.user_access drop constraint if exists user_access_status_check;
alter table public.user_access add constraint user_access_status_check
  check (status in ('pending','approved','suspended','blocked','quarantined'));

update public.user_access
set status = 'approved',
    approved_at = coalesce(approved_at, now()),
    reason = case when status = 'pending' then null else reason end,
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
select u.id, true,
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

-- ---------------------------------------------------------------------------
-- 2. AAL2 helpers and developer control-plane tables
-- ---------------------------------------------------------------------------

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
create index if not exists idx_feature_flag_rules_active
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
  ('repeated_access_denials', 5, 15, 'error', '{}'::jsonb)
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

-- All control-plane mutations are routed through the service-role developer Edge
-- Function after user identity, AAL2 and optional IP checks. Direct clients retain
-- only the minimum reads needed for normal application state.
foreach_dummy:
do $$
begin
  -- label used only to keep the block visually isolated; no-op body.
  null;
end $$;

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

grant usage, select on all sequences in schema public to service_role;

-- Replace direct developer mutation policies with AAL2-aware variants.
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

-- ---------------------------------------------------------------------------
-- 3. Module catalog and cohort evaluation
-- ---------------------------------------------------------------------------

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

create or replace function public.effective_feature_enabled(
  p_feature_key text,
  p_user_id uuid default auth.uid()
)
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
  select f.enabled into v_base
  from public.feature_flags f
  where f.key = p_feature_key;
  v_base := coalesce(v_base, true);

  if p_user_id is null then
    return v_base;
  end if;

  select o.enabled into v_override
  from public.feature_flag_overrides o
  where o.feature_key = p_feature_key and o.user_id = p_user_id;
  if found then return v_override; end if;

  select p.campus into v_campus from public.profiles p where p.id = p_user_id;
  select coalesce(array_agg(distinct ur.role::text), '{}'::text[])
    into v_roles
  from public.user_roles ur
  where ur.user_id = p_user_id;

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

-- ---------------------------------------------------------------------------
-- 4. Access/read-only/quarantine enforcement
-- ---------------------------------------------------------------------------

create or replace function public.current_app_access_allowed()
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_cfg jsonb;
  v_status text;
  v_expires timestamptz;
  v_email text;
  v_campus public.campus_location;
  v_session_id uuid;
  v_ip inet;
  v_device_hash text;
  v_roles text[] := '{}'::text[];
begin
  if v_uid is null then return false; end if;

  if public.is_developer(v_uid) and coalesce(auth.jwt() ->> 'aal','aal1') = 'aal2' then
    return true;
  end if;

  select rc.config into v_cfg from public.runtime_controls rc where rc.key = 'system';
  if coalesce((v_cfg ->> 'access_gate_enabled')::boolean, false) = false then return true; end if;

  if coalesce(v_cfg ->> 'mode','live') in ('maintenance','locked') then return false; end if;

  select ua.status, ua.expires_at into v_status, v_expires
  from public.user_access ua where ua.user_id = v_uid;
  if v_status in ('blocked','suspended') then return false; end if;
  if coalesce((v_cfg ->> 'approval_required')::boolean, false)
     and coalesce(v_status,'approved') not in ('approved','quarantined') then return false; end if;
  if v_expires is not null and v_expires <= now() then return false; end if;

  select lower(p.email), p.campus into v_email, v_campus
  from public.profiles p where p.id = v_uid;

  if v_campus is not null and exists (
    select 1 from public.campus_runtime_controls crc
    where crc.campus = v_campus and crc.mode in ('maintenance','locked')
  ) then return false; end if;

  if exists (
    select 1 from public.maintenance_windows mw
    where mw.active = true
      and mw.starts_at <= now() and mw.ends_at > now()
      and mw.mode in ('maintenance','locked')
      and (
        mw.scope = 'global' or
        (mw.scope = 'campus' and v_campus is not null and mw.campus = v_campus)
      )
  ) then return false; end if;

  select coalesce(array_agg(distinct ur.role::text), '{}'::text[])
  into v_roles from public.user_roles ur where ur.user_id = v_uid;
  if 'admin' = any(v_roles) and not public.effective_feature_enabled('admin_portal', v_uid) then return false; end if;
  if 'security' = any(v_roles) and not public.effective_feature_enabled('cps_portal', v_uid) then return false; end if;

  begin
    v_session_id := nullif(auth.jwt() ->> 'session_id','')::uuid;
  exception when others then
    v_session_id := null;
  end;

  if v_session_id is not null then
    if exists (
      select 1 from public.revoked_auth_sessions rs
      where rs.session_id = v_session_id
        and (rs.expires_at is null or rs.expires_at > now())
    ) then return false; end if;
    select s.ip into v_ip from auth.sessions s where s.id = v_session_id;
    select dr.device_hash into v_device_hash
      from public.device_registry dr
      where dr.auth_session_id = v_session_id
      order by dr.last_seen_at desc limit 1;
  end if;

  if exists (
    select 1 from public.access_restrictions ar
    where ar.active = true
      and (ar.expires_at is null or ar.expires_at > now())
      and (
        (ar.restriction_kind='user' and ar.target_user_id=v_uid) or
        (ar.restriction_kind='email' and lower(ar.target_email)=v_email) or
        (ar.restriction_kind='ip' and v_ip is not null and ar.target_ip=v_ip) or
        (ar.restriction_kind='device' and v_device_hash is not null and ar.target_device_hash=v_device_hash) or
        (ar.restriction_kind='session' and v_session_id is not null and ar.target_session_id=v_session_id)
      )
  ) then return false; end if;

  return true;
end;
$$;
revoke all on function public.current_app_access_allowed() from public, anon;
grant execute on function public.current_app_access_allowed() to authenticated, service_role;

create or replace function public.current_app_write_allowed()
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_cfg jsonb;
  v_status text;
  v_campus public.campus_location;
begin
  if v_uid is null then return false; end if;
  if public.is_developer(v_uid) and coalesce(auth.jwt() ->> 'aal','aal1') = 'aal2' then return true; end if;
  if not public.current_app_access_allowed() then return false; end if;

  select rc.config into v_cfg from public.runtime_controls rc where rc.key = 'system';
  if coalesce(v_cfg ->> 'mode','live') = 'read_only' then return false; end if;

  select ua.status into v_status from public.user_access ua where ua.user_id = v_uid;
  if v_status = 'quarantined' then return false; end if;

  select p.campus into v_campus from public.profiles p where p.id = v_uid;
  if v_campus is not null and exists (
    select 1 from public.campus_runtime_controls crc
    where crc.campus = v_campus and crc.mode = 'read_only'
  ) then return false; end if;

  if exists (
    select 1 from public.maintenance_windows mw
    where mw.active = true
      and mw.starts_at <= now() and mw.ends_at > now()
      and mw.mode = 'read_only'
      and (
        mw.scope = 'global' or
        (mw.scope = 'campus' and v_campus is not null and mw.campus = v_campus)
      )
  ) then return false; end if;

  return true;
end;
$$;
revoke all on function public.current_app_write_allowed() from public, anon;
grant execute on function public.current_app_write_allowed() to authenticated, service_role;

create or replace function public.current_module_write_allowed(p_module_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_app_write_allowed()
    and public.effective_feature_enabled(p_module_key, auth.uid())
    and not exists (
      select 1 from public.maintenance_windows mw
      where mw.active = true
        and mw.scope = 'module'
        and mw.module_key = p_module_key
        and mw.starts_at <= now() and mw.ends_at > now()
        and mw.mode in ('read_only','maintenance','locked')
    );
$$;
revoke all on function public.current_module_write_allowed(text) from public, anon;
grant execute on function public.current_module_write_allowed(text) to authenticated, service_role;

create or replace function public.enforce_ccsf_write_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if not public.current_app_write_allowed() then
    raise exception 'CCSF is currently read-only or this account is not permitted to write.' using errcode='42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.enforce_ccsf_module_write_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if not public.current_module_write_allowed(tg_argv[0]) then
    raise exception 'This CCSF module is currently disabled or read-only.' using errcode='42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Attach a global write guard to every public application table except the control
-- plane itself. This also covers SECURITY DEFINER RPC writes because triggers still fire.
do $$
declare r record;
begin
  for r in
    select c.relname as table_name
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname not in (
        'developer_access','user_access','runtime_controls','access_restrictions',
        'device_registry','revoked_auth_sessions','runtime_events','feature_flags',
        'feature_flag_overrides','developer_audit_logs','campus_runtime_controls',
        'maintenance_windows','developer_ip_allowlist','developer_reauth_sessions',
        'feature_flag_rules','security_anomalies','developer_alert_rules',
        'developer_alerts','release_markers'
      )
  loop
    execute format('drop trigger if exists trg_ccsf_write_guard on public.%I', r.table_name);
    execute format(
      'create trigger trg_ccsf_write_guard before insert or update or delete on public.%I for each row execute function public.enforce_ccsf_write_guard()',
      r.table_name
    );
  end loop;
end $$;

-- Module-specific server write gates.
do $$
declare r record;
begin
  -- Full module write freezes.
  for r in select * from (values
    ('student_safety_presence','radar'),
    ('safety_mobility_sessions','mobility'),
    ('safety_mobility_location_updates','mobility'),
    ('safety_mobility_events','mobility'),
    ('community_audit_logs','community'),
    ('community_badges','community'),
    ('community_event_registrations','community'),
    ('community_events','community'),
    ('community_game_participants','community'),
    ('community_game_submissions','community'),
    ('community_games','community'),
    ('community_points','community'),
    ('community_profiles','community'),
    ('community_role_applications','community'),
    ('community_role_assignments','community'),
    ('community_roles','community'),
    ('community_user_badges','community'),
    ('sports_fixtures','sport'),
    ('sports_team_compliance','sport'),
    ('sports_team_invitations','sport'),
    ('sports_team_join_requests','sport'),
    ('sports_team_members','sport'),
    ('sports_teams','sport'),
    ('tournaments','sport'),
    ('chat_messages','chat'),
    ('chat_room_members','chat'),
    ('chat_rooms','chat'),
    ('message_reactions','chat'),
    ('typing_indicators','chat'),
    ('incident_media','evidence')
  ) as x(table_name, module_key)
  loop
    if to_regclass('public.' || r.table_name) is not null then
      execute format('drop trigger if exists trg_ccsf_module_guard on public.%I', r.table_name);
      execute format(
        'create trigger trg_ccsf_module_guard before insert or update or delete on public.%I for each row execute function public.enforce_ccsf_module_write_guard(%L)',
        r.table_name, r.module_key
      );
    end if;
  end loop;

  -- Report Incident kills new incident intake while preserving existing case handling.
  if to_regclass('public.incidents') is not null then
    execute 'drop trigger if exists trg_ccsf_report_intake_guard on public.incidents';
    execute 'create trigger trg_ccsf_report_intake_guard before insert on public.incidents for each row execute function public.enforce_ccsf_module_write_guard(''report_incident'')';
  end if;
end $$;

-- Storage upload kill switches. Existing files remain readable under their existing policies.
drop policy if exists "CCSF developer storage insert gate" on storage.objects;
create policy "CCSF developer storage insert gate"
  on storage.objects as restrictive for insert to authenticated
  with check (
    public.current_app_write_allowed()
    and case
      when bucket_id in ('incident-media','pilot-report-attachments','pilot-review-attachments')
        then public.effective_feature_enabled('evidence', auth.uid())
      when bucket_id = 'chat-media'
        then public.effective_feature_enabled('chat', auth.uid())
      when bucket_id = 'community-team-logos'
        then public.effective_feature_enabled('sport', auth.uid())
      else true
    end
  );

drop policy if exists "CCSF developer storage update gate" on storage.objects;
create policy "CCSF developer storage update gate"
  on storage.objects as restrictive for update to authenticated
  using (public.current_app_write_allowed())
  with check (
    public.current_app_write_allowed()
    and case
      when bucket_id in ('incident-media','pilot-report-attachments','pilot-review-attachments')
        then public.effective_feature_enabled('evidence', auth.uid())
      when bucket_id = 'chat-media'
        then public.effective_feature_enabled('chat', auth.uid())
      when bucket_id = 'community-team-logos'
        then public.effective_feature_enabled('sport', auth.uid())
      else true
    end
  );

drop policy if exists "CCSF developer storage delete gate" on storage.objects;
create policy "CCSF developer storage delete gate"
  on storage.objects as restrictive for delete to authenticated
  using (public.current_app_write_allowed());

-- ---------------------------------------------------------------------------
-- 5. IP allowlist, fresh re-authentication and operational diagnostics RPCs
-- ---------------------------------------------------------------------------

create or replace function public.developer_ip_allowed(p_user_id uuid, p_ip text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_ip inet;
begin
  if p_ip is null or btrim(p_ip) = '' then return false; end if;
  begin v_ip := p_ip::inet; exception when others then return false; end;
  if not exists (
    select 1 from public.developer_ip_allowlist d
    where d.developer_id = p_user_id and d.enabled = true
  ) then return true; end if;
  return exists (
    select 1 from public.developer_ip_allowlist d
    where d.developer_id = p_user_id and d.enabled = true and v_ip <<= d.network
  );
end;
$$;
revoke all on function public.developer_ip_allowed(uuid, text) from public, anon, authenticated;
grant execute on function public.developer_ip_allowed(uuid, text) to service_role;

create or replace function public.developer_database_health()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, storage, pg_temp
as $$
declare v_result jsonb;
begin
  select jsonb_build_object(
    'database_size_bytes', pg_database_size(current_database()),
    'connections', (select count(*) from pg_stat_activity where datname = current_database()),
    'active_connections', (select count(*) from pg_stat_activity where datname = current_database() and state = 'active'),
    'long_running_queries', (select count(*) from pg_stat_activity where datname = current_database() and state = 'active' and query_start < now() - interval '5 seconds'),
    'dead_tuples', (select coalesce(sum(n_dead_tup),0) from pg_stat_user_tables),
    'live_tuples', (select coalesce(sum(n_live_tup),0) from pg_stat_user_tables),
    'storage_bytes', (
      select coalesce(sum(nullif(metadata ->> 'size','')::bigint),0)
      from storage.objects
      where metadata ? 'size'
    ),
    'runtime_errors_24h', (
      select count(*) from public.runtime_events
      where created_at >= now() - interval '24 hours' and severity in ('error','critical')
    ),
    'latest_runtime_event_at', (select max(created_at) from public.runtime_events),
    'latest_migration', (select max(version) from supabase_migrations.schema_migrations)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.developer_database_health() from public, anon, authenticated;
grant execute on function public.developer_database_health() to service_role;

create or replace function public.developer_operational_metrics(p_minutes integer default 60)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage, pg_temp
as $$
declare
  v_minutes integer := greatest(1, least(coalesce(p_minutes,60), 10080));
  v_since timestamptz;
  v_result jsonb;
begin
  v_since := now() - make_interval(mins => v_minutes);
  select jsonb_build_object(
    'window_minutes', v_minutes,
    'auth_sessions_created', (select count(*) from auth.sessions where created_at >= v_since),
    'auth_audit_events', (select count(*) from auth.audit_log_entries where created_at >= v_since),
    'reports_created', (select count(*) from public.incidents where created_at >= v_since),
    'pilot_reports_created', (select count(*) from public.pilot_reports where created_at >= v_since),
    'uploads_created', (select count(*) from storage.objects where created_at >= v_since),
    'edge_invocations', (select count(*) from public.runtime_events where created_at >= v_since and event_type = 'edge_invocation'),
    'access_denials', (select count(*) from public.runtime_events where created_at >= v_since and event_type = 'access_denied'),
    'errors', (select count(*) from public.runtime_events where created_at >= v_since and severity in ('error','critical')),
    'top_users', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select user_id, count(*) as events
        from public.runtime_events
        where created_at >= v_since and user_id is not null
        group by user_id order by count(*) desc limit 10
      ) x
    ), '[]'::jsonb),
    'top_ips', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select host(ip_address) as ip_address, count(*) as events
        from public.runtime_events
        where created_at >= v_since and ip_address is not null
        group by ip_address order by count(*) desc limit 10
      ) x
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.developer_operational_metrics(integer) from public, anon, authenticated;
grant execute on function public.developer_operational_metrics(integer) to service_role;

create or replace function public.developer_release_info()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_result jsonb;
begin
  select jsonb_build_object(
    'latest_migration', (select max(version) from supabase_migrations.schema_migrations),
    'migrations', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select version, name
        from supabase_migrations.schema_migrations
        order by version desc limit 20
      ) x
    ), '[]'::jsonb),
    'markers', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select id, kind, version, git_sha, branch, deployment_url, provider_state,
               migration_version, notes, metadata, created_at
        from public.release_markers
        order by created_at desc limit 20
      ) x
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.developer_release_info() from public, anon, authenticated;
grant execute on function public.developer_release_info() to service_role;

-- Session overview now includes coarse geography captured from trusted edge headers.
drop function if exists public.developer_session_overview();
create function public.developer_session_overview()
returns table (
  session_id uuid,user_id uuid,email text,full_name text,ip_address text,user_agent text,
  created_at timestamptz,updated_at timestamptz,refreshed_at timestamp,not_after timestamptz,
  device_hash text,device_type text,browser_name text,browser_version text,operating_system text,
  device_last_seen_at timestamptz,country_code text,region text,city text,revoked boolean
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  return query
  select s.id,s.user_id,p.email,p.full_name,host(s.ip),s.user_agent,s.created_at,s.updated_at,s.refreshed_at,s.not_after,
    dr.device_hash,dr.device_type,dr.browser_name,dr.browser_version,dr.operating_system,dr.last_seen_at,
    dr.country_code,dr.region,dr.city,
    exists(select 1 from public.revoked_auth_sessions rs where rs.session_id=s.id and (rs.expires_at is null or rs.expires_at>now()))
  from auth.sessions s
  left join public.profiles p on p.id=s.user_id
  left join lateral (
    select d.* from public.device_registry d
    where d.auth_session_id=s.id order by d.last_seen_at desc limit 1
  ) dr on true
  order by s.updated_at desc;
end;
$$;
revoke all on function public.developer_session_overview() from public, anon, authenticated;
grant execute on function public.developer_session_overview() to service_role;

-- Ensure user overview and revoke RPCs remain service-role-only behind developer-control.
revoke all on function public.developer_user_overview() from public, anon, authenticated;
grant execute on function public.developer_user_overview() to service_role;
revoke all on function public.developer_revoke_session(uuid, text) from public, anon, authenticated;
grant execute on function public.developer_revoke_session(uuid, text) to service_role;
revoke all on function public.developer_revoke_user_sessions(uuid, text) from public, anon, authenticated;
grant execute on function public.developer_revoke_user_sessions(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Security anomaly helpers
-- ---------------------------------------------------------------------------

create or replace function public.record_security_anomaly(
  p_rule_key text,
  p_user_id uuid,
  p_session_id uuid,
  p_ip text,
  p_severity text,
  p_title text,
  p_message text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_ip inet;
begin
  begin v_ip := nullif(p_ip,'')::inet; exception when others then v_ip := null; end;
  if exists (
    select 1 from public.security_anomalies a
    where a.rule_key = p_rule_key
      and a.user_id is not distinct from p_user_id
      and a.status = 'open'
      and a.created_at >= now() - interval '30 minutes'
  ) then return; end if;

  insert into public.security_anomalies(rule_key,user_id,auth_session_id,ip_address,severity,title,message,details)
  values(p_rule_key,p_user_id,p_session_id,v_ip,p_severity,p_title,p_message,coalesce(p_details,'{}'::jsonb));

  insert into public.developer_alerts(rule_key,severity,title,message,user_id,auth_session_id,ip_address,details)
  values(p_rule_key,p_severity,p_title,p_message,p_user_id,p_session_id,v_ip,coalesce(p_details,'{}'::jsonb));
end;
$$;
revoke all on function public.record_security_anomaly(text,uuid,uuid,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.record_security_anomaly(text,uuid,uuid,text,text,text,text,jsonb) to service_role;

create or replace function public.developer_detect_anomalies(
  p_user_id uuid,
  p_session_id uuid,
  p_ip text,
  p_device_hash text,
  p_country text,
  p_region text
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_ip_count integer;
  v_session_count integer;
  v_device_count integer;
  v_denials integer;
  v_prev_country text;
  v_prev_region text;
  v_prev_seen timestamptz;
begin
  if p_user_id is null then return; end if;

  select count(distinct ip_address) into v_ip_count
  from public.device_registry
  where user_id=p_user_id and last_seen_at >= now() - interval '30 minutes' and ip_address is not null;
  if v_ip_count >= 3 then
    perform public.record_security_anomaly('rapid_ip_switching',p_user_id,p_session_id,p_ip,'warning',
      'Rapid IP switching detected','This account appeared from multiple network addresses within 30 minutes.',
      jsonb_build_object('distinct_ips',v_ip_count));
  end if;

  select count(*) into v_session_count from auth.sessions
  where user_id=p_user_id and updated_at >= now() - interval '24 hours';
  if v_session_count >= 6 then
    perform public.record_security_anomaly('excessive_sessions',p_user_id,p_session_id,p_ip,'warning',
      'Excessive active/recent sessions','This account has an unusually high number of recent authentication sessions.',
      jsonb_build_object('session_count',v_session_count));
  end if;

  select count(distinct device_hash) into v_device_count
  from public.device_registry
  where user_id=p_user_id and last_seen_at >= now() - interval '24 hours';
  if v_device_count >= 4 then
    perform public.record_security_anomaly('suspicious_device_changes',p_user_id,p_session_id,p_ip,'warning',
      'Multiple device changes detected','This account has used several device fingerprints in the last 24 hours.',
      jsonb_build_object('device_count',v_device_count));
  end if;

  select count(*) into v_denials from public.runtime_events
  where user_id=p_user_id and event_type='access_denied' and created_at >= now() - interval '15 minutes';
  if v_denials >= 5 then
    perform public.record_security_anomaly('repeated_access_denials',p_user_id,p_session_id,p_ip,'error',
      'Repeated access denials','This account repeatedly attempted access after a control-plane denial.',
      jsonb_build_object('denials',v_denials));
  end if;

  select d.country_code,d.region,d.last_seen_at into v_prev_country,v_prev_region,v_prev_seen
  from public.device_registry d
  where d.user_id=p_user_id
    and d.device_hash is distinct from p_device_hash
    and d.last_seen_at >= now() - interval '2 hours'
    and (d.country_code is not null or d.region is not null)
  order by d.last_seen_at desc limit 1;

  if v_prev_seen is not null and p_country is not null and v_prev_country is not null
     and lower(p_country) <> lower(v_prev_country) then
    perform public.record_security_anomaly('impossible_travel',p_user_id,p_session_id,p_ip,'error',
      'Possible impossible travel','The same account appeared in different countries within a short period.',
      jsonb_build_object('previous_country',v_prev_country,'current_country',p_country,'previous_region',v_prev_region,'current_region',p_region,'previous_seen_at',v_prev_seen));
  end if;
end;
$$;
revoke all on function public.developer_detect_anomalies(uuid,uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.developer_detect_anomalies(uuid,uuid,text,text,text,text) to service_role;

-- ---------------------------------------------------------------------------
-- 7. Final safe defaults. Enforcement is enabled only after the frontend is merged
--    and deployed; the migration keeps the gate value unchanged for staged rollout.
-- ---------------------------------------------------------------------------

update public.runtime_controls
set config = jsonb_set(coalesce(config,'{}'::jsonb), '{approval_required}', 'false'::jsonb, true),
    updated_at = now()
where key='system';
