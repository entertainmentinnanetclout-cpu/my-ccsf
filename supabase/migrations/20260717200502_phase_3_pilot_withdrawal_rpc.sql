create or replace function pilot_private.withdraw_session(p_session_id uuid, p_reason text)
returns jsonb
language plpgsql security definer
set search_path=public,private,pilot_private
as $$
declare
  v_actor uuid:=auth.uid();
  v_session public.pilot_sessions%rowtype;
  v_role public.user_role;
  v_count integer:=0;
begin
  if v_actor is null or nullif(btrim(p_reason),'') is null then raise exception 'Authentication and reason are required'; end if;
  select * into v_session from public.pilot_sessions where id=p_session_id for update;
  if not found then raise exception 'Session not found'; end if;
  if v_session.user_id<>v_actor and not private.pilot_is_super_admin(v_actor) then raise exception 'Access denied'; end if;
  v_role:=private.pilot_actor_role(v_actor);
  insert into public.pilot_report_events(program_id,report_id,session_id,event_type,from_status,to_status,actor_id,actor_role,notes)
  select program_id,id,session_id,'status_changed',status,'withdrawn',v_actor,v_role,p_reason
  from public.pilot_reports
  where session_id=p_session_id and status not in ('simulation_completed','cancelled','withdrawn','expired');
  update public.pilot_reports set status='withdrawn', updated_at=now()
  where session_id=p_session_id and status not in ('simulation_completed','cancelled','withdrawn','expired');
  get diagnostics v_count=row_count;
  update public.pilot_sessions set status='withdrawn', completed_at=coalesce(completed_at,now()), updated_at=now() where id=p_session_id;
  update public.pilot_participants set status='withdrawn', withdrawn_at=now(), withdrawal_reason=p_reason, updated_at=now() where id=v_session.participant_id;
  insert into public.pilot_audit_logs(program_id,actor_id,actor_role,actor_campus,action,entity_type,entity_id,affected_count,reason)
  values(v_session.program_id,v_actor,v_role,v_session.campus,'session_withdrawn','pilot_session',v_session.id,v_count+1,p_reason);
  return jsonb_build_object('status','withdrawn','session_id',p_session_id,'reports_withdrawn',v_count);
end $$;
create or replace function public.pilot_withdraw_session(p_session_id uuid, p_reason text)
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.withdraw_session(p_session_id,p_reason) $$;
revoke all on function pilot_private.withdraw_session(uuid,text) from public, anon;
grant execute on function pilot_private.withdraw_session(uuid,text) to authenticated, service_role;
revoke all on function public.pilot_withdraw_session(uuid,text) from public, anon;
grant execute on function public.pilot_withdraw_session(uuid,text) to authenticated;