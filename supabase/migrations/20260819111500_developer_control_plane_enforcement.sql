-- CCSF developer control plane: server-side access, read-only/quarantine and module enforcement.

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
    where mw.active = true and mw.starts_at <= now() and mw.ends_at > now()
      and mw.mode in ('maintenance','locked')
      and (mw.scope = 'global' or (mw.scope = 'campus' and v_campus is not null and mw.campus = v_campus))
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
      where rs.session_id = v_session_id and (rs.expires_at is null or rs.expires_at > now())
    ) then return false; end if;
    select s.ip into v_ip from auth.sessions s where s.id = v_session_id;
    select dr.device_hash into v_device_hash
    from public.device_registry dr where dr.auth_session_id = v_session_id
    order by dr.last_seen_at desc limit 1;
  end if;

  if exists (
    select 1 from public.access_restrictions ar
    where ar.active = true and (ar.expires_at is null or ar.expires_at > now())
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
    select 1 from public.campus_runtime_controls crc where crc.campus = v_campus and crc.mode = 'read_only'
  ) then return false; end if;

  if exists (
    select 1 from public.maintenance_windows mw
    where mw.active = true and mw.starts_at <= now() and mw.ends_at > now()
      and mw.mode = 'read_only'
      and (mw.scope = 'global' or (mw.scope = 'campus' and v_campus is not null and mw.campus = v_campus))
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
      where mw.active = true and mw.scope = 'module' and mw.module_key = p_module_key
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

do $$
declare r record;
begin
  for r in
    select c.relname as table_name
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname not in (
        'developer_access','user_access','runtime_controls','access_restrictions','device_registry',
        'revoked_auth_sessions','runtime_events','feature_flags','feature_flag_overrides','developer_audit_logs',
        'campus_runtime_controls','maintenance_windows','developer_ip_allowlist','developer_reauth_sessions',
        'feature_flag_rules','security_anomalies','developer_alert_rules','developer_alerts','release_markers'
      )
  loop
    execute format('drop trigger if exists trg_ccsf_write_guard on public.%I', r.table_name);
    execute format('create trigger trg_ccsf_write_guard before insert or update or delete on public.%I for each row execute function public.enforce_ccsf_write_guard()', r.table_name);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select * from (values
    ('student_safety_presence','radar'),
    ('safety_mobility_sessions','mobility'),
    ('safety_mobility_location_updates','mobility'),
    ('safety_mobility_events','mobility'),
    ('community_audit_logs','community'),('community_badges','community'),
    ('community_event_registrations','community'),('community_events','community'),
    ('community_game_participants','community'),('community_game_submissions','community'),
    ('community_games','community'),('community_points','community'),('community_profiles','community'),
    ('community_role_applications','community'),('community_role_assignments','community'),
    ('community_roles','community'),('community_user_badges','community'),
    ('sports_fixtures','sport'),('sports_team_compliance','sport'),('sports_team_invitations','sport'),
    ('sports_team_join_requests','sport'),('sports_team_members','sport'),('sports_teams','sport'),('tournaments','sport'),
    ('chat_messages','chat'),('chat_room_members','chat'),('chat_rooms','chat'),('message_reactions','chat'),('typing_indicators','chat'),
    ('incident_media','evidence')
  ) as x(table_name, module_key)
  loop
    if to_regclass('public.' || r.table_name) is not null then
      execute format('drop trigger if exists trg_ccsf_module_guard on public.%I', r.table_name);
      execute format('create trigger trg_ccsf_module_guard before insert or update or delete on public.%I for each row execute function public.enforce_ccsf_module_write_guard(%L)', r.table_name, r.module_key);
    end if;
  end loop;

  if to_regclass('public.incidents') is not null then
    execute 'drop trigger if exists trg_ccsf_report_intake_guard on public.incidents';
    execute 'create trigger trg_ccsf_report_intake_guard before insert on public.incidents for each row execute function public.enforce_ccsf_module_write_guard(''report_incident'')';
  end if;
end $$;

drop policy if exists "CCSF developer storage insert gate" on storage.objects;
create policy "CCSF developer storage insert gate" on storage.objects as restrictive for insert to authenticated
with check (
  public.current_app_write_allowed()
  and case
    when bucket_id in ('incident-media','pilot-report-attachments','pilot-review-attachments') then public.effective_feature_enabled('evidence', auth.uid())
    when bucket_id = 'chat-media' then public.effective_feature_enabled('chat', auth.uid())
    when bucket_id = 'community-team-logos' then public.effective_feature_enabled('sport', auth.uid())
    else true
  end
);

drop policy if exists "CCSF developer storage update gate" on storage.objects;
create policy "CCSF developer storage update gate" on storage.objects as restrictive for update to authenticated
using (public.current_app_write_allowed())
with check (
  public.current_app_write_allowed()
  and case
    when bucket_id in ('incident-media','pilot-report-attachments','pilot-review-attachments') then public.effective_feature_enabled('evidence', auth.uid())
    when bucket_id = 'chat-media' then public.effective_feature_enabled('chat', auth.uid())
    when bucket_id = 'community-team-logos' then public.effective_feature_enabled('sport', auth.uid())
    else true
  end
);

drop policy if exists "CCSF developer storage delete gate" on storage.objects;
create policy "CCSF developer storage delete gate" on storage.objects as restrictive for delete to authenticated
using (public.current_app_write_allowed());
