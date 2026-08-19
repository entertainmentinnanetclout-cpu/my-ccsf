-- Privileged developer RPCs are callable only by the service role.
-- The developer-control Edge Function authenticates and authorises the human developer first.

create or replace function public.developer_user_overview()
returns table (
  user_id uuid,
  email text,
  full_name text,
  first_name text,
  last_name text,
  campus text,
  roles text[],
  access_status text,
  access_reason text,
  account_created_at timestamptz,
  last_sign_in_at timestamptz,
  active_sessions bigint,
  last_session_at timestamptz
)
language sql
security definer
set search_path = public, auth, pg_temp
as $$
  select
    p.id,
    p.email,
    p.full_name,
    p.first_name,
    p.last_name,
    p.campus::text,
    coalesce(array_agg(distinct ur.role::text) filter (where ur.role is not null), '{}'::text[]),
    coalesce(ua.status, 'pending'),
    ua.reason,
    au.created_at,
    au.last_sign_in_at,
    count(distinct s.id),
    max(s.updated_at)
  from public.profiles p
  join auth.users au on au.id = p.id
  left join public.user_roles ur on ur.user_id = p.id
  left join public.user_access ua on ua.user_id = p.id
  left join auth.sessions s on s.user_id = p.id
  group by p.id,p.email,p.full_name,p.first_name,p.last_name,p.campus,ua.status,ua.reason,au.created_at,au.last_sign_in_at
  order by au.created_at desc;
$$;

create or replace function public.developer_session_overview()
returns table (
  session_id uuid,
  user_id uuid,
  email text,
  full_name text,
  ip_address text,
  user_agent text,
  created_at timestamptz,
  updated_at timestamptz,
  refreshed_at timestamp,
  not_after timestamptz,
  device_hash text,
  device_type text,
  browser_name text,
  browser_version text,
  operating_system text,
  device_last_seen_at timestamptz,
  revoked boolean
)
language sql
security definer
set search_path = public, auth, pg_temp
as $$
  select
    s.id,
    s.user_id,
    p.email,
    p.full_name,
    host(s.ip),
    s.user_agent,
    s.created_at,
    s.updated_at,
    s.refreshed_at,
    s.not_after,
    dr.device_hash,
    dr.device_type,
    dr.browser_name,
    dr.browser_version,
    dr.operating_system,
    dr.last_seen_at,
    exists (
      select 1 from public.revoked_auth_sessions rs
      where rs.session_id = s.id and (rs.expires_at is null or rs.expires_at > now())
    )
  from auth.sessions s
  left join public.profiles p on p.id = s.user_id
  left join lateral (
    select d.* from public.device_registry d
    where d.auth_session_id = s.id
    order by d.last_seen_at desc
    limit 1
  ) dr on true
  order by s.updated_at desc;
$$;

create or replace function public.developer_revoke_session(target_session_id uuid, revoke_reason text default 'Revoked by developer')
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
<<fn>>
declare
  v_user_id uuid;
begin
  select s.user_id into v_user_id from auth.sessions s where s.id = target_session_id;
  if v_user_id is null then return false; end if;

  insert into public.revoked_auth_sessions(session_id,user_id,reason,revoked_by)
  values (target_session_id,v_user_id,fn.revoke_reason,null)
  on conflict (session_id) do update
    set reason = excluded.reason, revoked_at = now();

  update public.device_registry dr
  set revoked_at = now(), revoke_reason = fn.revoke_reason
  where dr.auth_session_id = target_session_id;

  return true;
end;
$$;

create or replace function public.developer_revoke_user_sessions(target_user_id uuid, revoke_reason text default 'Revoked by developer')
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
<<fn>>
declare
  v_count integer;
begin
  insert into public.revoked_auth_sessions(session_id,user_id,reason,revoked_by)
  select s.id,s.user_id,fn.revoke_reason,null
  from auth.sessions s
  where s.user_id = target_user_id
  on conflict (session_id) do update
    set reason = excluded.reason, revoked_at = now();

  get diagnostics v_count = row_count;

  update public.device_registry dr
  set revoked_at = now(), revoke_reason = fn.revoke_reason
  where dr.user_id = target_user_id;

  return v_count;
end;
$$;

revoke all on function public.developer_user_overview() from public, anon, authenticated;
revoke all on function public.developer_session_overview() from public, anon, authenticated;
revoke all on function public.developer_revoke_session(uuid,text) from public, anon, authenticated;
revoke all on function public.developer_revoke_user_sessions(uuid,text) from public, anon, authenticated;
grant execute on function public.developer_user_overview() to service_role;
grant execute on function public.developer_session_overview() to service_role;
grant execute on function public.developer_revoke_session(uuid,text) to service_role;
grant execute on function public.developer_revoke_user_sessions(uuid,text) to service_role;
