-- Final God Mode hardening: evidence draft/attachment shutdown, runtime alerts,
-- and pg_stat_statements-backed query latency diagnostics.

do $$
declare r record;
begin
  for r in select * from (values
    ('evidence_submission_drafts','evidence'),
    ('pilot_attachments','evidence')
  ) as x(table_name,module_key)
  loop
    if to_regclass('public.' || r.table_name) is not null then
      execute format('drop trigger if exists trg_ccsf_module_guard on public.%I', r.table_name);
      execute format('create trigger trg_ccsf_module_guard before insert or update or delete on public.%I for each row execute function public.enforce_ccsf_module_write_guard(%L)', r.table_name, r.module_key);
    end if;
  end loop;
end $$;

create or replace function public.ccsf_runtime_alert_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_error_count integer;
begin
  if new.severity = 'critical' then
    if not exists (
      select 1 from public.developer_alerts a
      where a.rule_key = 'critical_client_error'
        and a.user_id is not distinct from new.user_id
        and a.acknowledged_at is null
        and a.created_at >= now() - interval '5 minutes'
    ) then
      insert into public.developer_alerts(rule_key,severity,title,message,user_id,auth_session_id,ip_address,details)
      values('critical_client_error','critical','Critical CCSF runtime failure',coalesce(new.message,'A critical runtime event was recorded.'),new.user_id,new.auth_session_id,new.ip_address,
        jsonb_build_object('event_id',new.id,'event_type',new.event_type,'route',new.route,'edge_function',new.edge_function,'status_code',new.status_code));
    end if;
  end if;

  if new.severity in ('error','critical') then
    select count(*) into v_error_count
    from public.runtime_events e
    where e.created_at >= now() - interval '15 minutes'
      and e.severity in ('error','critical');
    if v_error_count >= 10 and not exists (
      select 1 from public.developer_alerts a
      where a.rule_key = 'client_error_burst'
        and a.acknowledged_at is null
        and a.created_at >= now() - interval '15 minutes'
    ) then
      insert into public.developer_alerts(rule_key,severity,title,message,user_id,auth_session_id,ip_address,details)
      values('client_error_burst','error','CCSF error-rate threshold exceeded','Ten or more error/critical runtime events occurred within 15 minutes.',new.user_id,new.auth_session_id,new.ip_address,
        jsonb_build_object('error_count',v_error_count,'window_minutes',15));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ccsf_runtime_alerts on public.runtime_events;
create trigger trg_ccsf_runtime_alerts
after insert on public.runtime_events
for each row execute function public.ccsf_runtime_alert_trigger();

create or replace function public.developer_database_health()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, storage, extensions, pg_temp
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
    'mean_query_exec_ms', (
      select round((sum(total_exec_time) / nullif(sum(calls),0))::numeric, 3)
      from extensions.pg_stat_statements
      where calls > 0
    ),
    'slow_statement_count', (
      select count(*) from extensions.pg_stat_statements where mean_exec_time >= 250
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
