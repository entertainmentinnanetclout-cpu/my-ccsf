create or replace function pilot_private.purge_campus_plan(p_program_id uuid, p_campus public.campus_location, p_reason text)
returns jsonb
language plpgsql security definer
set search_path=public,private,pilot_private
as $$
declare v_actor uuid:=auth.uid(); v_paths text[]; v_role public.user_role; v_participants integer; v_sessions integer; v_reports integer;
begin
  if v_actor is null or nullif(btrim(p_reason),'') is null then raise exception 'Authentication and reason are required'; end if;
  if not private.pilot_is_super_admin(v_actor) and not (private.pilot_is_security(v_actor) and private.pilot_is_head(v_actor) and private.pilot_user_campus(v_actor)=p_campus) then raise exception 'Campus-head or super-admin authority required'; end if;
  if not exists(select 1 from public.pilot_programs where id=p_program_id and p_campus=any(eligible_campuses)) then raise exception 'Programme campus not found'; end if;
  v_role:=private.pilot_actor_role(v_actor);
  select coalesce(array_agg(a.storage_path order by a.storage_path),'{}'::text[]) into v_paths from public.pilot_attachments a join public.pilot_reports r on r.id=a.report_id where a.program_id=p_program_id and r.campus=p_campus;
  select count(*) into v_participants from public.pilot_participants where program_id=p_program_id and campus=p_campus;
  select count(*) into v_sessions from public.pilot_sessions where program_id=p_program_id and campus=p_campus;
  select count(*) into v_reports from public.pilot_reports where program_id=p_program_id and campus=p_campus;
  if cardinality(v_paths)=0 then
    delete from public.pilot_participants where program_id=p_program_id and campus=p_campus;
    insert into public.pilot_audit_logs(program_id,actor_id,actor_role,actor_campus,action,entity_type,entity_id,affected_count,reason,metadata)
    values(p_program_id,v_actor,v_role,p_campus,'campus_purged','pilot_campus',null,v_participants+v_sessions+v_reports,p_reason,jsonb_build_object('participants',v_participants,'sessions',v_sessions,'reports',v_reports));
    return jsonb_build_object('status','deleted','operation','campus','program_id',p_program_id,'campus',p_campus,'storage_paths',v_paths);
  end if;
  return jsonb_build_object('status','storage_cleanup_required','operation','campus','program_id',p_program_id,'campus',p_campus,'reason',p_reason,'storage_paths',v_paths,'participants',v_participants,'sessions',v_sessions,'reports',v_reports);
end $$;
create or replace function public.pilot_purge_campus(p_program_id uuid, p_campus public.campus_location, p_reason text)
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.purge_campus_plan(p_program_id,p_campus,p_reason) $$;
revoke all on function pilot_private.purge_campus_plan(uuid,public.campus_location,text) from public, anon;
grant execute on function pilot_private.purge_campus_plan(uuid,public.campus_location,text) to authenticated, service_role;
revoke all on function public.pilot_purge_campus(uuid,public.campus_location,text) from public, anon;
grant execute on function public.pilot_purge_campus(uuid,public.campus_location,text) to authenticated;