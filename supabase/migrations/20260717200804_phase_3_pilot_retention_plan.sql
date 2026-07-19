create or replace function pilot_private.expired_data_plan()
returns jsonb
language plpgsql security definer
set search_path=public,private,pilot_private
as $$
declare
  v_actor uuid:=auth.uid();
  v_paths text[];
  v_sessions uuid[];
begin
  if v_actor is null or not private.pilot_is_super_admin(v_actor) then raise exception 'Super-admin authority required'; end if;
  select coalesce(array_agg(distinct s.id order by s.id),'{}'::uuid[]) into v_sessions
  from public.pilot_sessions s
  join public.pilot_programs p on p.id=s.program_id
  where (s.status in ('completed','withdrawn','expired','abandoned') and coalesce(s.completed_at,s.last_activity_at)+make_interval(days=>p.retention_days)<=now())
     or (s.status='in_progress' and s.expires_at<=now());
  select coalesce(array_agg(a.storage_path order by a.storage_path),'{}'::text[]) into v_paths
  from public.pilot_attachments a
  where a.session_id=any(v_sessions);
  return jsonb_build_object('status',case when cardinality(v_paths)>0 then 'storage_cleanup_required' else 'ready_for_finalisation' end,'operation','expired','session_ids',v_sessions,'storage_paths',v_paths,'reason','retention_expired');
end $$;
create or replace function public.pilot_purge_expired()
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.expired_data_plan() $$;
revoke all on function pilot_private.expired_data_plan() from public, anon;
grant execute on function pilot_private.expired_data_plan() to authenticated, service_role;
revoke all on function public.pilot_purge_expired() from public, anon;
grant execute on function public.pilot_purge_expired() to authenticated;