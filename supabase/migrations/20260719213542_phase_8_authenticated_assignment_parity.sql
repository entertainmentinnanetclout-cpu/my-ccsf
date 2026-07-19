-- Phase 8 UAT parity correction.
-- Campus-security staff may assign a Pilot report to their own authenticated
-- same-campus profile. A super-admin may accept cross-campus triage ownership
-- only by assigning the report to their own authenticated admin profile.
-- No production incident or dispatch function is changed by this migration.

create or replace function pilot_private.transition_report(
  p_report_id uuid,
  p_to_status public.pilot_report_status,
  p_notes text default null,
  p_assigned_to uuid default null
)
returns public.pilot_reports
language plpgsql
security definer
set search_path to 'public', 'private', 'pilot_private'
as $function$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.user_role;
  v_row public.pilot_reports%rowtype;
  v_from public.pilot_report_status;
  v_event public.pilot_event_type;
  v_notification public.pilot_notification_type;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;

  select * into v_row
  from public.pilot_reports
  where id = p_report_id
  for update;

  if not found or not private.pilot_can_manage_report(v_actor, p_report_id) then
    raise exception 'Report not found or access denied';
  end if;

  v_actor_role := private.pilot_actor_role(v_actor);
  if v_actor_role not in ('security', 'admin') then
    raise exception 'Staff role required';
  end if;

  v_from := v_row.status;
  if not (
    (v_from = 'received' and p_to_status in ('assessing', 'cancelled', 'withdrawn')) or
    (v_from = 'assessing' and p_to_status in ('assigned', 'cancelled', 'withdrawn')) or
    (v_from = 'assigned' and p_to_status in ('in_progress', 'cancelled', 'withdrawn')) or
    (v_from = 'in_progress' and p_to_status in ('simulation_completed', 'cancelled', 'withdrawn'))
  ) then
    raise exception 'Invalid pilot report status transition';
  end if;

  if p_to_status = 'assigned' then
    if p_assigned_to is null then
      raise exception 'Assigned staff member is required';
    end if;

    if private.raw_has_role(p_assigned_to, 'security'::public.user_role) then
      if private.raw_get_user_campus(p_assigned_to) <> v_row.campus then
        raise exception 'Assigned security officer must belong to the report campus';
      end if;
    elsif private.raw_has_role(p_assigned_to, 'admin'::public.user_role) then
      if v_actor_role <> 'admin' or p_assigned_to <> v_actor then
        raise exception 'A super-admin may assign only their own authenticated profile';
      end if;
    else
      raise exception 'Assigned staff member must be campus security or the acting super-admin';
    end if;
  elsif p_assigned_to is not null and p_assigned_to is distinct from v_row.assigned_to then
    raise exception 'Assignment may only change during assigned transition';
  end if;

  if p_to_status = 'in_progress' and v_row.assigned_to is null then
    raise exception 'Report must be assigned before progress begins';
  end if;

  update public.pilot_reports
  set status = p_to_status,
      assigned_to = case when p_to_status = 'assigned' then p_assigned_to else assigned_to end,
      simulation_completed_at = case when p_to_status = 'simulation_completed' then now() else simulation_completed_at end,
      updated_at = now()
  where id = p_report_id
  returning * into v_row;

  v_event := case
    when p_to_status = 'assigned' then 'assigned'::public.pilot_event_type
    when p_to_status = 'simulation_completed' then 'simulation_completed'::public.pilot_event_type
    else 'status_changed'::public.pilot_event_type
  end;

  insert into public.pilot_report_events(
    program_id, report_id, session_id, event_type, from_status, to_status,
    actor_id, actor_role, notes, metadata
  )
  values(
    v_row.program_id, v_row.id, v_row.session_id, v_event, v_from, p_to_status,
    v_actor, v_actor_role, nullif(btrim(p_notes), ''),
    case when p_to_status = 'assigned'
      then jsonb_build_object('assigned_to', p_assigned_to)
      else '{}'::jsonb
    end
  );

  v_notification := case
    when p_to_status = 'assigned' then 'assigned'::public.pilot_notification_type
    when p_to_status = 'simulation_completed' then 'simulation_completed'::public.pilot_notification_type
    else 'status_changed'::public.pilot_notification_type
  end;

  insert into public.pilot_notifications(
    program_id, session_id, report_id, user_id, notification_type,
    title, message, created_by
  )
  values(
    v_row.program_id, v_row.session_id, v_row.id, v_row.submitted_by, v_notification,
    'Pilot report update',
    'Your simulated report status is now ' || replace(p_to_status::text, '_', ' ') ||
      '. No emergency service has been dispatched.',
    v_actor
  );

  return v_row;
end
$function$;
