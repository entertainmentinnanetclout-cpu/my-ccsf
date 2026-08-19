-- CCSF developer control plane: operational metrics, database/release health,
-- session geography, anomaly detection and fresh re-authentication helpers.

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
      select coalesce(sum(case when metadata ? 'size' and (metadata ->> 'size') ~ '^[0-9]+$' then (metadata ->> 'size')::bigint else 0 end),0)
      from storage.objects
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

revoke all on function public.developer_user_overview() from public, anon, authenticated;
grant execute on function public.developer_user_overview() to service_role;
revoke all on function public.developer_revoke_session(uuid, text) from public, anon, authenticated;
grant execute on function public.developer_revoke_session(uuid, text) to service_role;
revoke all on function public.developer_revoke_user_sessions(uuid, text) from public, anon, authenticated;
grant execute on function public.developer_revoke_user_sessions(uuid, text) to service_role;

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

  select count(*) into v_session_count
  from auth.sessions where user_id=p_user_id and updated_at >= now() - interval '24 hours';
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

  select count(*) into v_denials
  from public.runtime_events
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
      jsonb_build_object('previous_country',v_prev_country,'current_country',p_country,
        'previous_region',v_prev_region,'current_region',p_region,'previous_seen_at',v_prev_seen));
  end if;
end;
$$;
revoke all on function public.developer_detect_anomalies(uuid,uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.developer_detect_anomalies(uuid,uuid,text,text,text,text) to service_role;
