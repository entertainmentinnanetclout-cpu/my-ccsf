create or replace function pilot_private.finalize_report_deletion(p_report_id uuid,p_reason text,p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,private,pilot_private,storage
as $$
declare
  v_report public.pilot_reports%rowtype;
  v_paths text[];
  v_role public.user_role;
begin
  if p_actor_id is null or nullif(btrim(p_reason),'') is null then raise exception 'Actor and reason are required'; end if;
  select * into v_report from public.pilot_reports where id=p_report_id for update;
  if not found then return jsonb_build_object('status','already_deleted','operation','report','entity_id',p_report_id); end if;
  select coalesce(array_agg(storage_path order by storage_path),'{}'::text[]) into v_paths
  from public.pilot_attachments where report_id=p_report_id;
  perform pilot_private.assert_storage_paths_cleared(v_paths);
  v_role:=private.pilot_actor_role(p_actor_id);
  delete from public.pilot_reports where id=p_report_id;
  insert into public.pilot_audit_logs(program_id,actor_id,actor_role,actor_campus,action,entity_type,entity_id,affected_count,reason,metadata)
  values(v_report.program_id,p_actor_id,v_role,v_report.campus,'report_deleted','pilot_report',p_report_id,1,p_reason,jsonb_build_object('storage_objects_removed',cardinality(v_paths)));
  return jsonb_build_object('status','deleted','operation','report','entity_id',p_report_id,'storage_objects_removed',cardinality(v_paths));
end $$;

create or replace function pilot_private.finalize_session_deletion(p_session_id uuid,p_reason text,p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,private,pilot_private,storage
as $$
declare
  v_session public.pilot_sessions%rowtype;
  v_paths text[];
  v_role public.user_role;
  v_reports integer;
begin
  if p_actor_id is null or nullif(btrim(p_reason),'') is null then raise exception 'Actor and reason are required'; end if;
  select * into v_session from public.pilot_sessions where id=p_session_id for update;
  if not found then return jsonb_build_object('status','already_deleted','operation','session','entity_id',p_session_id); end if;
  select coalesce(array_agg(storage_path order by storage_path),'{}'::text[]) into v_paths
  from public.pilot_attachments where session_id=p_session_id;
  perform pilot_private.assert_storage_paths_cleared(v_paths);
  select count(*) into v_reports from public.pilot_reports where session_id=p_session_id;
  v_role:=private.pilot_actor_role(p_actor_id);
  delete from public.pilot_sessions where id=p_session_id;
  insert into public.pilot_audit_logs(program_id,actor_id,actor_role,actor_campus,action,entity_type,entity_id,affected_count,reason,metadata)
  values(v_session.program_id,p_actor_id,v_role,v_session.campus,'session_deleted','pilot_session',p_session_id,v_reports+1,p_reason,jsonb_build_object('reports_deleted',v_reports,'storage_objects_removed',cardinality(v_paths)));
  return jsonb_build_object('status','deleted','operation','session','entity_id',p_session_id,'reports_deleted',v_reports,'storage_objects_removed',cardinality(v_paths));
end $$;

create or replace function public.pilot_finalize_delete_report(p_report_id uuid,p_reason text,p_actor_id uuid)
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.finalize_report_deletion(p_report_id,p_reason,p_actor_id) $$;
create or replace function public.pilot_finalize_delete_session(p_session_id uuid,p_reason text,p_actor_id uuid)
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.finalize_session_deletion(p_session_id,p_reason,p_actor_id) $$;

revoke all on function pilot_private.finalize_report_deletion(uuid,text,uuid),pilot_private.finalize_session_deletion(uuid,text,uuid) from public,anon,authenticated;
grant execute on function pilot_private.finalize_report_deletion(uuid,text,uuid),pilot_private.finalize_session_deletion(uuid,text,uuid) to service_role;
revoke all on function public.pilot_finalize_delete_report(uuid,text,uuid),public.pilot_finalize_delete_session(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.pilot_finalize_delete_report(uuid,text,uuid),public.pilot_finalize_delete_session(uuid,text,uuid) to service_role;