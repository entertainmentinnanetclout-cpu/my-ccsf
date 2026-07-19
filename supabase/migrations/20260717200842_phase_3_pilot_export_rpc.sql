create or replace function pilot_private.export_data(p_program_id uuid, p_campus public.campus_location default null, p_identified boolean default false)
returns jsonb
language plpgsql security definer
set search_path=public,private,pilot_private
as $$
declare
  v_actor uuid:=auth.uid();
  v_role public.user_role;
  v_actor_campus public.campus_location;
  v_effective_campus public.campus_location;
  v_result jsonb;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  v_role:=private.pilot_actor_role(v_actor);
  v_actor_campus:=private.pilot_user_campus(v_actor);
  if v_role='admin' then
    v_effective_campus:=p_campus;
  elsif v_role='security' then
    if p_campus is not null and p_campus<>v_actor_campus then raise exception 'Campus export is restricted to the caller campus'; end if;
    if p_identified then raise exception 'Identified exports require super-admin authority'; end if;
    v_effective_campus:=v_actor_campus;
  else
    raise exception 'Staff role required';
  end if;
  if not exists(select 1 from public.pilot_programs where id=p_program_id) then raise exception 'Programme not found'; end if;

  select jsonb_build_object(
    'generated_at',now(),
    'program_id',p_program_id,
    'campus',v_effective_campus,
    'identified',p_identified,
    'reports',coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'reference_number',case when p_identified then r.reference_number else null end,
        'participant_key',case when p_identified then r.submitted_by::text else md5(r.program_id::text||r.submitted_by::text) end,
        'campus',r.campus,
        'category',r.category,
        'status',r.status,
        'title',case when p_identified then r.title else null end,
        'description',case when p_identified then r.description else null end,
        'is_anonymous',r.is_anonymous,
        'submitted_at',r.submitted_at,
        'simulation_completed_at',r.simulation_completed_at,
        'attachment_count',(select count(*) from public.pilot_attachments a where a.report_id=r.id),
        'event_count',(select count(*) from public.pilot_report_events e where e.report_id=r.id)
      )) order by r.submitted_at)
      from public.pilot_reports r
      where r.program_id=p_program_id and (v_effective_campus is null or r.campus=v_effective_campus)
    ),'[]'::jsonb),
    'feature_results',coalesce((
      select jsonb_agg(jsonb_build_object('feature_key',feature_key,'outcome',outcome,'count',result_count) order by feature_key,outcome)
      from (
        select ft.feature_key,ft.outcome,count(*) result_count
        from public.pilot_feature_tests ft join public.pilot_sessions s on s.id=ft.session_id
        where ft.program_id=p_program_id and (v_effective_campus is null or s.campus=v_effective_campus)
        group by ft.feature_key,ft.outcome
      ) x
    ),'[]'::jsonb),
    'feedback_summary',coalesce((
      select jsonb_build_object(
        'responses',count(*),
        'ease_of_use_average',round(avg(ease_of_use_rating)::numeric,2),
        'confidence_average',round(avg(confidence_rating)::numeric,2),
        'clarity_average',round(avg(clarity_rating)::numeric,2),
        'would_use_in_emergency_yes',count(*) filter (where would_use_in_emergency=true)
      )
      from public.pilot_feedback f join public.pilot_sessions s on s.id=f.session_id
      where f.program_id=p_program_id and (v_effective_campus is null or s.campus=v_effective_campus)
    ),'{}'::jsonb)
  ) into v_result;

  insert into public.pilot_audit_logs(program_id,actor_id,actor_role,actor_campus,action,entity_type,entity_id,affected_count,reason,metadata)
  values(p_program_id,v_actor,v_role,v_actor_campus,'data_exported','pilot_program',p_program_id,1,'Pilot data export',jsonb_build_object('campus',v_effective_campus,'identified',p_identified));
  return v_result;
end $$;

create or replace function public.pilot_export_data(p_program_id uuid, p_campus public.campus_location default null, p_identified boolean default false)
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.export_data(p_program_id,p_campus,p_identified) $$;
revoke all on function pilot_private.export_data(uuid,public.campus_location,boolean) from public, anon;
grant execute on function pilot_private.export_data(uuid,public.campus_location,boolean) to authenticated, service_role;
revoke all on function public.pilot_export_data(uuid,public.campus_location,boolean) from public, anon;
grant execute on function public.pilot_export_data(uuid,public.campus_location,boolean) to authenticated;