create or replace function pilot_private.execute_expired_cleanup()
returns jsonb
language plpgsql security definer
set search_path=public,private,pilot_private,storage
as $$
declare
  v_actor uuid:=auth.uid();
  v_sessions uuid[];
begin
  if v_actor is null or not private.pilot_is_super_admin(v_actor) then raise exception 'Super-admin authority required'; end if;
  select coalesce(array_agg(distinct s.id order by s.id),'{}'::uuid[]) into v_sessions
  from public.pilot_sessions s
  join public.pilot_programs p on p.id=s.program_id
  where (s.status in ('completed','withdrawn','expired','abandoned') and coalesce(s.completed_at,s.last_activity_at)+make_interval(days=>p.retention_days)<=now())
     or (s.status='in_progress' and s.expires_at<=now());
  if exists(
    select 1
    from storage.objects o
    join public.pilot_attachments a on a.storage_path=o.name
    where o.bucket_id='pilot-report-attachments' and a.session_id=any(v_sessions)
  ) then raise exception 'Pilot attachment storage cleanup is incomplete'; end if;
  return pilot_private.finalize_expired_purge(v_sessions,v_actor);
end $$;
create or replace function public.pilot_execute_expired_cleanup()
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.execute_expired_cleanup() $$;
revoke all on function pilot_private.execute_expired_cleanup() from public,anon;
grant execute on function pilot_private.execute_expired_cleanup() to authenticated,service_role;
revoke all on function public.pilot_execute_expired_cleanup() from public,anon;
grant execute on function public.pilot_execute_expired_cleanup() to authenticated;