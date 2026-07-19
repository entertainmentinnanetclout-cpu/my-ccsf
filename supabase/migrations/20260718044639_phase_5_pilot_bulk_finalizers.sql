create or replace function pilot_private.finalize_campus_purge(p_program_id uuid,p_campus public.campus_location,p_reason text,p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,private,pilot_private,storage
as $$
declare
  v_paths text[];
  v_role public.user_role;
  v_participants integer;
  v_sessions integer;
  v_reports integer;
begin
  if p_actor_id is null or nullif(btrim(p_reason),'') is null then raise exception 'Actor and reason are required'; end if;
  if not exists(select 1 from public.pilot_programs where id=p_program_id) then return jsonb_build_object('status','already_deleted','operation','campus','program_id',p_program_id,'campus',p_campus); end if;
  select coalesce(array_agg(a.storage_path order by a.storage_path),'{}'::text[]) into v_paths
  from public.pilot_attachments a join public.pilot_reports r on r.id=a.report_id
  where a.program_id=p_program_id and r.campus=p_campus;
  perform pilot_private.assert_storage_paths_cleared(v_paths);
  select count(*) into v_participants from public.pilot_participants where program_id=p_program_id and campus=p_campus;
  select count(*) into v_sessions from public.pilot_sessions where program_id=p_program_id and campus=p_campus;
  select count(*) into v_reports from public.pilot_reports where program_id=p_program_id and campus=p_campus;
  v_role:=private.pilot_actor_role(p_actor_id);
  delete from public.pilot_participants where program_id=p_program_id and campus=p_campus;
  insert into public.pilot_audit_logs(program_id,actor_id,actor_role,actor_campus,action,entity_type,entity_id,affected_count,reason,metadata)
  values(p_program_id,p_actor_id,v_role,p_campus,'campus_purged','pilot_campus',null,v_participants+v_sessions+v_reports,p_reason,jsonb_build_object('participants',v_participants,'sessions',v_sessions,'reports',v_reports,'storage_objects_removed',cardinality(v_paths)));
  return jsonb_build_object('status','deleted','operation','campus','program_id',p_program_id,'campus',p_campus,'participants',v_participants,'sessions',v_sessions,'reports',v_reports,'storage_objects_removed',cardinality(v_paths));
end $$;

create or replace function pilot_private.finalize_program_purge(p_program_id uuid,p_reason text,p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,private,pilot_private,storage
as $$
declare
  v_program public.pilot_programs%rowtype;
  v_paths text[];
  v_role public.user_role;
  v_participants integer;
  v_sessions integer;
  v_reports integer;
begin
  if p_actor_id is null or nullif(btrim(p_reason),'') is null then raise exception 'Actor and reason are required'; end if;
  select * into v_program from public.pilot_programs where id=p_program_id for update;
  if not found then return jsonb_build_object('status','already_deleted','operation','program','entity_id',p_program_id); end if;
  select coalesce(array_agg(storage_path order by storage_path),'{}'::text[]) into v_paths from public.pilot_attachments where program_id=p_program_id;
  perform pilot_private.assert_storage_paths_cleared(v_paths);
  select count(*) into v_participants from public.pilot_participants where program_id=p_program_id;
  select count(*) into v_sessions from public.pilot_sessions where program_id=p_program_id;
  select count(*) into v_reports from public.pilot_reports where program_id=p_program_id;
  v_role:=private.pilot_actor_role(p_actor_id);
  insert into public.pilot_audit_logs(program_id,actor_id,actor_role,actor_campus,action,entity_type,entity_id,affected_count,reason,metadata)
  values(p_program_id,p_actor_id,v_role,private.pilot_user_campus(p_actor_id),'program_purged','pilot_program',p_program_id,v_participants+v_sessions+v_reports+1,p_reason,jsonb_build_object('participants',v_participants,'sessions',v_sessions,'reports',v_reports,'storage_objects_removed',cardinality(v_paths)));
  delete from public.pilot_programs where id=p_program_id;
  return jsonb_build_object('status','deleted','operation','program','entity_id',p_program_id,'participants',v_participants,'sessions',v_sessions,'reports',v_reports,'storage_objects_removed',cardinality(v_paths));
end $$;

create or replace function pilot_private.finalize_expired_purge(p_session_ids uuid[],p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,private,pilot_private,storage
as $$
declare
  v_paths text[];
  v_requested integer:=coalesce(cardinality(p_session_ids),0);
  v_eligible integer;
  v_deleted integer;
begin
  if p_actor_id is null then raise exception 'Actor is required'; end if;
  if v_requested=0 then return jsonb_build_object('status','deleted','operation','expired','sessions_deleted',0,'storage_objects_removed',0); end if;
  select count(*) into v_eligible
  from public.pilot_sessions s join public.pilot_programs p on p.id=s.program_id
  where s.id=any(p_session_ids)
    and ((s.status in ('completed','withdrawn','expired','abandoned') and coalesce(s.completed_at,s.last_activity_at)+make_interval(days=>p.retention_days)<=now())
      or (s.status='in_progress' and s.expires_at<=now()));
  if v_eligible<>v_requested then raise exception 'One or more sessions are not eligible for retention purge'; end if;
  select coalesce(array_agg(storage_path order by storage_path),'{}'::text[]) into v_paths
  from public.pilot_attachments where session_id=any(p_session_ids);
  perform pilot_private.assert_storage_paths_cleared(v_paths);
  insert into public.pilot_audit_logs(program_id,actor_id,actor_role,actor_campus,action,entity_type,entity_id,affected_count,reason,metadata)
  select s.program_id,p_actor_id,private.pilot_actor_role(p_actor_id),private.pilot_user_campus(p_actor_id),'retention_purged','pilot_session_batch',null,count(*),'retention_expired',jsonb_build_object('session_ids',jsonb_agg(s.id))
  from public.pilot_sessions s where s.id=any(p_session_ids) group by s.program_id;
  delete from public.pilot_sessions where id=any(p_session_ids);
  get diagnostics v_deleted=row_count;
  return jsonb_build_object('status','deleted','operation','expired','sessions_deleted',v_deleted,'storage_objects_removed',cardinality(v_paths));
end $$;

create or replace function public.pilot_finalize_purge_campus(p_program_id uuid,p_campus public.campus_location,p_reason text,p_actor_id uuid)
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.finalize_campus_purge(p_program_id,p_campus,p_reason,p_actor_id) $$;
create or replace function public.pilot_finalize_purge_program(p_program_id uuid,p_reason text,p_actor_id uuid)
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.finalize_program_purge(p_program_id,p_reason,p_actor_id) $$;
create or replace function public.pilot_finalize_purge_expired(p_session_ids uuid[],p_actor_id uuid)
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.finalize_expired_purge(p_session_ids,p_actor_id) $$;

revoke all on function pilot_private.finalize_campus_purge(uuid,public.campus_location,text,uuid),pilot_private.finalize_program_purge(uuid,text,uuid),pilot_private.finalize_expired_purge(uuid[],uuid) from public,anon,authenticated;
grant execute on function pilot_private.finalize_campus_purge(uuid,public.campus_location,text,uuid),pilot_private.finalize_program_purge(uuid,text,uuid),pilot_private.finalize_expired_purge(uuid[],uuid) to service_role;
revoke all on function public.pilot_finalize_purge_campus(uuid,public.campus_location,text,uuid),public.pilot_finalize_purge_program(uuid,text,uuid),public.pilot_finalize_purge_expired(uuid[],uuid) from public,anon,authenticated;
grant execute on function public.pilot_finalize_purge_campus(uuid,public.campus_location,text,uuid),public.pilot_finalize_purge_program(uuid,text,uuid),public.pilot_finalize_purge_expired(uuid[],uuid) to service_role;