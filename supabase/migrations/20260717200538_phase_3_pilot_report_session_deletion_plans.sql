create or replace function pilot_private.delete_report_plan(p_report_id uuid, p_reason text)
returns jsonb
language plpgsql security definer
set search_path=public,private,pilot_private
as $$
declare v_actor uuid:=auth.uid(); v_report public.pilot_reports%rowtype; v_session_status public.pilot_session_status; v_paths text[]; v_role public.user_role;
begin
  if v_actor is null or nullif(btrim(p_reason),'') is null then raise exception 'Authentication and reason are required'; end if;
  select * into v_report from public.pilot_reports where id=p_report_id for update;
  if not found then raise exception 'Report not found'; end if;
  select status into v_session_status from public.pilot_sessions where id=v_report.session_id;
  if not private.pilot_can_manage_report(v_actor,p_report_id) and not (v_report.submitted_by=v_actor and v_session_status='withdrawn') then raise exception 'Access denied'; end if;
  v_role:=private.pilot_actor_role(v_actor);
  select coalesce(array_agg(storage_path order by storage_path),'{}'::text[]) into v_paths from public.pilot_attachments where report_id=p_report_id;
  if cardinality(v_paths)=0 then
    delete from public.pilot_reports where id=p_report_id;
    insert into public.pilot_audit_logs(program_id,actor_id,actor_role,actor_campus,action,entity_type,entity_id,affected_count,reason)
    values(v_report.program_id,v_actor,v_role,v_report.campus,'report_deleted','pilot_report',p_report_id,1,p_reason);
    return jsonb_build_object('status','deleted','operation','report','entity_id',p_report_id,'storage_paths',v_paths);
  end if;
  return jsonb_build_object('status','storage_cleanup_required','operation','report','entity_id',p_report_id,'program_id',v_report.program_id,'campus',v_report.campus,'reason',p_reason,'storage_paths',v_paths);
end $$;

create or replace function pilot_private.delete_session_plan(p_session_id uuid, p_reason text)
returns jsonb
language plpgsql security definer
set search_path=public,private,pilot_private
as $$
declare v_actor uuid:=auth.uid(); v_session public.pilot_sessions%rowtype; v_paths text[]; v_role public.user_role; v_count integer;
begin
  if v_actor is null or nullif(btrim(p_reason),'') is null then raise exception 'Authentication and reason are required'; end if;
  select * into v_session from public.pilot_sessions where id=p_session_id for update;
  if not found then raise exception 'Session not found'; end if;
  if not private.pilot_is_super_admin(v_actor) and not (v_session.user_id=v_actor and v_session.status='withdrawn') then raise exception 'Access denied'; end if;
  v_role:=private.pilot_actor_role(v_actor);
  select coalesce(array_agg(a.storage_path order by a.storage_path),'{}'::text[]) into v_paths from public.pilot_attachments a where a.session_id=p_session_id;
  select count(*) into v_count from public.pilot_reports where session_id=p_session_id;
  if cardinality(v_paths)=0 then
    delete from public.pilot_sessions where id=p_session_id;
    insert into public.pilot_audit_logs(program_id,actor_id,actor_role,actor_campus,action,entity_type,entity_id,affected_count,reason)
    values(v_session.program_id,v_actor,v_role,v_session.campus,'session_deleted','pilot_session',p_session_id,v_count+1,p_reason);
    return jsonb_build_object('status','deleted','operation','session','entity_id',p_session_id,'storage_paths',v_paths,'reports_deleted',v_count);
  end if;
  return jsonb_build_object('status','storage_cleanup_required','operation','session','entity_id',p_session_id,'program_id',v_session.program_id,'campus',v_session.campus,'reason',p_reason,'storage_paths',v_paths);
end $$;

create or replace function public.pilot_delete_report(p_report_id uuid, p_reason text)
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.delete_report_plan(p_report_id,p_reason) $$;
create or replace function public.pilot_delete_session(p_session_id uuid, p_reason text)
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.delete_session_plan(p_session_id,p_reason) $$;
revoke all on function pilot_private.delete_report_plan(uuid,text), pilot_private.delete_session_plan(uuid,text) from public, anon;
grant execute on function pilot_private.delete_report_plan(uuid,text), pilot_private.delete_session_plan(uuid,text) to authenticated, service_role;
revoke all on function public.pilot_delete_report(uuid,text), public.pilot_delete_session(uuid,text) from public, anon;
grant execute on function public.pilot_delete_report(uuid,text), public.pilot_delete_session(uuid,text) to authenticated;