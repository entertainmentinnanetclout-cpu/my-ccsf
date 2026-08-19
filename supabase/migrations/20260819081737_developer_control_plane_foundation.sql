-- CCSF Developer Control Plane foundation
-- Adds owner-only developer access, approval gating, session/device controls,
-- runtime feature flags, telemetry, and server-side access enforcement.

create table if not exists public.developer_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_owner boolean not null default false,
  permissions jsonb not null default '{"system":true,"users":true,"sessions":true,"features":true,"health":true,"audit":true}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_developer(check_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.developer_access da where da.user_id = check_user_id); $$;

create or replace function public.is_developer_owner(check_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.developer_access da where da.user_id = check_user_id and da.is_owner = true); $$;

revoke all on function public.is_developer(uuid) from public;
revoke all on function public.is_developer_owner(uuid) from public;
grant execute on function public.is_developer(uuid) to authenticated;
grant execute on function public.is_developer_owner(uuid) to authenticated;

alter table public.developer_access enable row level security;
drop policy if exists "Developers can view developer access" on public.developer_access;
create policy "Developers can view developer access" on public.developer_access for select to authenticated using (user_id = auth.uid() or public.is_developer_owner(auth.uid()));
drop policy if exists "Developer owner can insert developer access" on public.developer_access;
create policy "Developer owner can insert developer access" on public.developer_access for insert to authenticated with check (public.is_developer_owner(auth.uid()));
drop policy if exists "Developer owner can update developer access" on public.developer_access;
create policy "Developer owner can update developer access" on public.developer_access for update to authenticated using (public.is_developer_owner(auth.uid())) with check (public.is_developer_owner(auth.uid()));
drop policy if exists "Developer owner can delete developer access" on public.developer_access;
create policy "Developer owner can delete developer access" on public.developer_access for delete to authenticated using (public.is_developer_owner(auth.uid()) and user_id <> auth.uid());

-- Bootstrap the existing ResKonnect owner profile as the sole developer owner.
insert into public.developer_access (user_id, is_owner, created_by)
select p.id, true, p.id from public.profiles p where lower(p.email) = 'reskonnect@gmail.com'
on conflict (user_id) do update set is_owner = true, updated_at = now();

create table if not exists public.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','suspended','blocked')),
  reason text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.user_access (user_id, status, approved_at)
select p.id, 'approved', now() from public.profiles p on conflict (user_id) do nothing;

create or replace function public.ensure_new_user_access()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.user_access (user_id, status)
  values (new.id, case when public.is_developer(new.id) then 'approved' else 'pending' end)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_profiles_user_access on public.profiles;
create trigger trg_profiles_user_access after insert on public.profiles for each row execute function public.ensure_new_user_access();

alter table public.user_access enable row level security;
drop policy if exists "Users can view own access status" on public.user_access;
create policy "Users can view own access status" on public.user_access for select to authenticated using (user_id = auth.uid() or public.is_developer(auth.uid()));
drop policy if exists "Developers manage user access" on public.user_access;
create policy "Developers manage user access" on public.user_access for all to authenticated using (public.is_developer(auth.uid())) with check (public.is_developer(auth.uid()));

create table if not exists public.runtime_controls (
  key text primary key,
  config jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.runtime_controls (key, config, description)
values ('system','{"mode":"live","message":"","approval_required":true,"access_gate_enabled":false,"fail_closed_ui":false,"telemetry_enabled":true}'::jsonb,'Global application access and telemetry controls')
on conflict (key) do nothing;
alter table public.runtime_controls enable row level security;
drop policy if exists "Runtime controls are readable" on public.runtime_controls;
create policy "Runtime controls are readable" on public.runtime_controls for select to anon, authenticated using (true);
drop policy if exists "Developers manage runtime controls" on public.runtime_controls;
create policy "Developers manage runtime controls" on public.runtime_controls for all to authenticated using (public.is_developer(auth.uid())) with check (public.is_developer(auth.uid()));

create table if not exists public.access_restrictions (
  id uuid primary key default gen_random_uuid(),
  restriction_kind text not null check (restriction_kind in ('user','email','ip','device','session')),
  target_user_id uuid references auth.users(id) on delete cascade,
  target_email text,
  target_ip inet,
  target_device_hash text,
  target_session_id uuid,
  reason text not null default 'Developer restriction',
  active boolean not null default true,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint access_restrictions_target_check check (
    (restriction_kind = 'user' and target_user_id is not null) or
    (restriction_kind = 'email' and target_email is not null) or
    (restriction_kind = 'ip' and target_ip is not null) or
    (restriction_kind = 'device' and target_device_hash is not null) or
    (restriction_kind = 'session' and target_session_id is not null)
  )
);
create index if not exists idx_access_restrictions_user on public.access_restrictions(target_user_id) where active;
create index if not exists idx_access_restrictions_email on public.access_restrictions(lower(target_email)) where active;
create index if not exists idx_access_restrictions_ip on public.access_restrictions(target_ip) where active;
create index if not exists idx_access_restrictions_device on public.access_restrictions(target_device_hash) where active;
create index if not exists idx_access_restrictions_session on public.access_restrictions(target_session_id) where active;
alter table public.access_restrictions enable row level security;
drop policy if exists "Developers manage access restrictions" on public.access_restrictions;
create policy "Developers manage access restrictions" on public.access_restrictions for all to authenticated using (public.is_developer(auth.uid())) with check (public.is_developer(auth.uid()));

create table if not exists public.device_registry (
  id uuid primary key default gen_random_uuid(),
  auth_session_id uuid,
  user_id uuid references auth.users(id) on delete cascade,
  device_hash text not null,
  device_type text,
  browser_name text,
  browser_version text,
  operating_system text,
  ip_address inet,
  user_agent text,
  locale text,
  timezone text,
  viewport_width integer,
  viewport_height integer,
  network_type text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text
);
create index if not exists idx_device_registry_session on public.device_registry(auth_session_id);
create index if not exists idx_device_registry_user on public.device_registry(user_id, last_seen_at desc);
create index if not exists idx_device_registry_hash on public.device_registry(device_hash);
create index if not exists idx_device_registry_ip on public.device_registry(ip_address);
alter table public.device_registry enable row level security;
drop policy if exists "Developers can view devices" on public.device_registry;
create policy "Developers can view devices" on public.device_registry for select to authenticated using (public.is_developer(auth.uid()));
drop policy if exists "Users can view own devices" on public.device_registry;
create policy "Users can view own devices" on public.device_registry for select to authenticated using (user_id = auth.uid());

create table if not exists public.revoked_auth_sessions (
  session_id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  reason text,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz not null default now(),
  expires_at timestamptz
);
alter table public.revoked_auth_sessions enable row level security;
drop policy if exists "Developers can view revoked sessions" on public.revoked_auth_sessions;
create policy "Developers can view revoked sessions" on public.revoked_auth_sessions for select to authenticated using (public.is_developer(auth.uid()));

create table if not exists public.runtime_events (
  id bigint generated by default as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  auth_session_id uuid,
  device_hash text,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','error','critical')),
  route text,
  message text,
  stack text,
  duration_ms integer,
  status_code integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_runtime_events_created on public.runtime_events(created_at desc);
create index if not exists idx_runtime_events_severity on public.runtime_events(severity, created_at desc);
create index if not exists idx_runtime_events_type on public.runtime_events(event_type, created_at desc);
create index if not exists idx_runtime_events_user on public.runtime_events(user_id, created_at desc);
alter table public.runtime_events enable row level security;
drop policy if exists "Users can create own runtime events" on public.runtime_events;
create policy "Users can create own runtime events" on public.runtime_events for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Developers can view runtime events" on public.runtime_events;
create policy "Developers can view runtime events" on public.runtime_events for select to authenticated using (public.is_developer(auth.uid()));

create table if not exists public.feature_flags (
  key text primary key,
  description text,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.feature_flags (key, description, enabled) values
  ('official_dashboard','Official student dashboard',true),
  ('pilot_reporting','Pilot reporting and simulation flow',true),
  ('pilot_reviews','Pilot review and feedback tools',true),
  ('pilot_resources','Pilot resources library',true),
  ('safety_quest','Safety Quest experience',true),
  ('live_location','Location and mobility features',true),
  ('evidence_uploads','Evidence and attachment upload tools',true),
  ('push_notifications','Push notification features',true)
on conflict (key) do nothing;
alter table public.feature_flags enable row level security;
drop policy if exists "Authenticated users can read feature flags" on public.feature_flags;
create policy "Authenticated users can read feature flags" on public.feature_flags for select to authenticated using (true);
drop policy if exists "Developers manage feature flags" on public.feature_flags;
create policy "Developers manage feature flags" on public.feature_flags for all to authenticated using (public.is_developer(auth.uid())) with check (public.is_developer(auth.uid()));

create table if not exists public.feature_flag_overrides (
  feature_key text not null references public.feature_flags(key) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  enabled boolean not null,
  reason text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (feature_key, user_id)
);
alter table public.feature_flag_overrides enable row level security;
drop policy if exists "Users can read own feature overrides" on public.feature_flag_overrides;
create policy "Users can read own feature overrides" on public.feature_flag_overrides for select to authenticated using (user_id = auth.uid() or public.is_developer(auth.uid()));
drop policy if exists "Developers manage feature overrides" on public.feature_flag_overrides;
create policy "Developers manage feature overrides" on public.feature_flag_overrides for all to authenticated using (public.is_developer(auth.uid())) with check (public.is_developer(auth.uid()));

create table if not exists public.developer_audit_logs (
  id bigint generated by default as identity primary key,
  developer_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_developer_audit_created on public.developer_audit_logs(created_at desc);
create index if not exists idx_developer_audit_developer on public.developer_audit_logs(developer_id, created_at desc);
alter table public.developer_audit_logs enable row level security;
drop policy if exists "Developers can view audit logs" on public.developer_audit_logs;
create policy "Developers can view audit logs" on public.developer_audit_logs for select to authenticated using (public.is_developer(auth.uid()));

create or replace function public.current_app_access_allowed()
returns boolean language plpgsql stable security definer set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid(); v_cfg jsonb; v_status text; v_expires timestamptz; v_email text;
  v_session_id uuid; v_ip inet; v_device_hash text;
begin
  if v_uid is null then return false; end if;
  if public.is_developer(v_uid) then return true; end if;
  select rc.config into v_cfg from public.runtime_controls rc where rc.key = 'system';
  if coalesce((v_cfg ->> 'access_gate_enabled')::boolean, false) = false then return true; end if;
  if coalesce(v_cfg ->> 'mode','live') <> 'live' then return false; end if;
  select ua.status, ua.expires_at into v_status, v_expires from public.user_access ua where ua.user_id = v_uid;
  if v_status in ('blocked','suspended') then return false; end if;
  if coalesce((v_cfg ->> 'approval_required')::boolean, true) and coalesce(v_status,'pending') <> 'approved' then return false; end if;
  if v_expires is not null and v_expires <= now() then return false; end if;
  select lower(p.email) into v_email from public.profiles p where p.id = v_uid;
  begin v_session_id := nullif(auth.jwt() ->> 'session_id','')::uuid; exception when others then v_session_id := null; end;
  if v_session_id is not null then
    if exists (select 1 from public.revoked_auth_sessions rs where rs.session_id = v_session_id and (rs.expires_at is null or rs.expires_at > now())) then return false; end if;
    select s.ip into v_ip from auth.sessions s where s.id = v_session_id;
    select dr.device_hash into v_device_hash from public.device_registry dr where dr.auth_session_id = v_session_id order by dr.last_seen_at desc limit 1;
  end if;
  if exists (
    select 1 from public.access_restrictions ar
    where ar.active = true and (ar.expires_at is null or ar.expires_at > now()) and (
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
revoke all on function public.current_app_access_allowed() from public;
grant execute on function public.current_app_access_allowed() to authenticated;

do $$
declare r record;
begin
  for r in select c.relname as table_name from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity=true
      and c.relname not in ('developer_access','user_access','runtime_controls','access_restrictions','device_registry','revoked_auth_sessions','runtime_events','feature_flags','feature_flag_overrides','developer_audit_logs','profiles','user_roles')
  loop
    execute format('drop policy if exists %I on public.%I','CCSF developer access gate',r.table_name);
    execute format('create policy %I on public.%I as restrictive for all to authenticated using (public.current_app_access_allowed()) with check (public.current_app_access_allowed())','CCSF developer access gate',r.table_name);
  end loop;
end $$;

create or replace function public.developer_user_overview()
returns table (user_id uuid,email text,full_name text,first_name text,last_name text,campus text,roles text[],access_status text,access_reason text,account_created_at timestamptz,last_sign_in_at timestamptz,active_sessions bigint,last_session_at timestamptz)
language plpgsql security definer set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_developer(auth.uid()) then raise exception 'Developer access required' using errcode='42501'; end if;
  return query
  select p.id,p.email,p.full_name,p.first_name,p.last_name,p.campus::text,
    coalesce(array_agg(distinct ur.role::text) filter (where ur.role is not null),'{}'::text[]),
    coalesce(ua.status,'pending'),ua.reason,au.created_at,au.last_sign_in_at,count(distinct s.id),max(s.updated_at)
  from public.profiles p join auth.users au on au.id=p.id
  left join public.user_roles ur on ur.user_id=p.id left join public.user_access ua on ua.user_id=p.id left join auth.sessions s on s.user_id=p.id
  group by p.id,p.email,p.full_name,p.first_name,p.last_name,p.campus,ua.status,ua.reason,au.created_at,au.last_sign_in_at
  order by au.created_at desc;
end;
$$;

create or replace function public.developer_session_overview()
returns table (session_id uuid,user_id uuid,email text,full_name text,ip_address text,user_agent text,created_at timestamptz,updated_at timestamptz,refreshed_at timestamp,not_after timestamptz,device_hash text,device_type text,browser_name text,browser_version text,operating_system text,device_last_seen_at timestamptz,revoked boolean)
language plpgsql security definer set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_developer(auth.uid()) then raise exception 'Developer access required' using errcode='42501'; end if;
  return query
  select s.id,s.user_id,p.email,p.full_name,host(s.ip),s.user_agent,s.created_at,s.updated_at,s.refreshed_at,s.not_after,
    dr.device_hash,dr.device_type,dr.browser_name,dr.browser_version,dr.operating_system,dr.last_seen_at,
    exists(select 1 from public.revoked_auth_sessions rs where rs.session_id=s.id and (rs.expires_at is null or rs.expires_at>now()))
  from auth.sessions s left join public.profiles p on p.id=s.user_id
  left join lateral (select d.* from public.device_registry d where d.auth_session_id=s.id order by d.last_seen_at desc limit 1) dr on true
  order by s.updated_at desc;
end;
$$;

create or replace function public.developer_revoke_session(target_session_id uuid, revoke_reason text default 'Revoked by developer')
returns boolean language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare v_user_id uuid;
begin
  if not public.is_developer(auth.uid()) then raise exception 'Developer access required' using errcode='42501'; end if;
  select s.user_id into v_user_id from auth.sessions s where s.id=target_session_id;
  if v_user_id is null then return false; end if;
  insert into public.revoked_auth_sessions(session_id,user_id,reason,revoked_by) values(target_session_id,v_user_id,revoke_reason,auth.uid())
  on conflict(session_id) do update set reason=excluded.reason,revoked_by=excluded.revoked_by,revoked_at=now();
  update public.device_registry set revoked_at=now(),revoke_reason=revoke_reason where auth_session_id=target_session_id;
  insert into public.developer_audit_logs(developer_id,action,target_type,target_id,details) values(auth.uid(),'revoke_session','session',target_session_id::text,jsonb_build_object('reason',revoke_reason,'user_id',v_user_id));
  return true;
end;
$$;

create or replace function public.developer_revoke_user_sessions(target_user_id uuid, revoke_reason text default 'Revoked by developer')
returns integer language plpgsql security definer set search_path = public, auth, pg_temp
as $$
declare v_count integer;
begin
  if not public.is_developer(auth.uid()) then raise exception 'Developer access required' using errcode='42501'; end if;
  insert into public.revoked_auth_sessions(session_id,user_id,reason,revoked_by)
  select s.id,s.user_id,revoke_reason,auth.uid() from auth.sessions s where s.user_id=target_user_id
  on conflict(session_id) do update set reason=excluded.reason,revoked_by=excluded.revoked_by,revoked_at=now();
  get diagnostics v_count = row_count;
  update public.device_registry set revoked_at=now(),revoke_reason=revoke_reason where user_id=target_user_id;
  insert into public.developer_audit_logs(developer_id,action,target_type,target_id,details) values(auth.uid(),'revoke_user_sessions','user',target_user_id::text,jsonb_build_object('reason',revoke_reason,'session_count',v_count));
  return v_count;
end;
$$;

revoke all on function public.developer_user_overview() from public;
revoke all on function public.developer_session_overview() from public;
revoke all on function public.developer_revoke_session(uuid,text) from public;
revoke all on function public.developer_revoke_user_sessions(uuid,text) from public;
grant execute on function public.developer_user_overview() to authenticated;
grant execute on function public.developer_session_overview() to authenticated;
grant execute on function public.developer_revoke_session(uuid,text) to authenticated;
grant execute on function public.developer_revoke_user_sessions(uuid,text) to authenticated;
