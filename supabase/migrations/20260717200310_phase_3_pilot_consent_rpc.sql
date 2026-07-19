create or replace function pilot_private.consent_participation(p_participant_id uuid, p_consent_version text)
returns public.pilot_participants
language plpgsql security definer
set search_path=public,private,pilot_private
as $$
declare
  v_actor uuid:=auth.uid();
  v_row public.pilot_participants%rowtype;
  v_program_status public.pilot_program_status;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if nullif(btrim(p_consent_version),'') is null then raise exception 'Consent version is required'; end if;
  select * into v_row from public.pilot_participants where id=p_participant_id for update;
  if not found or v_row.user_id<>v_actor then raise exception 'Participant record not found'; end if;
  select status into v_program_status from public.pilot_programs where id=v_row.program_id;
  if v_program_status in ('completed','archived') then raise exception 'Pilot programme is closed'; end if;
  if v_row.status not in ('invited','consented') then raise exception 'Participation cannot be consented from current status'; end if;
  update public.pilot_participants
  set status='consented', consented_at=coalesce(consented_at,now()), consent_version=p_consent_version, withdrawn_at=null, withdrawal_reason=null, updated_at=now()
  where id=p_participant_id returning * into v_row;
  insert into public.pilot_audit_logs(program_id,actor_id,actor_role,actor_campus,action,entity_type,entity_id,reason,metadata)
  values(v_row.program_id,v_actor,'student',v_row.campus,'participant_consented','pilot_participant',v_row.id,null,jsonb_build_object('consent_version',p_consent_version));
  return v_row;
end $$;

create or replace function public.pilot_consent_participation(p_participant_id uuid, p_consent_version text)
returns public.pilot_participants
language sql security invoker
set search_path=public,pilot_private
as $$ select pilot_private.consent_participation(p_participant_id,p_consent_version) $$;

revoke all on function pilot_private.consent_participation(uuid,text) from public, anon;
grant execute on function pilot_private.consent_participation(uuid,text) to authenticated, service_role;
revoke all on function public.pilot_consent_participation(uuid,text) from public, anon;
grant execute on function public.pilot_consent_participation(uuid,text) to authenticated;