-- Bind all student-facing Safety Mobility RPCs to the authenticated student's verified campus.

create or replace function private.safety_require_student_campus(p_campus public.campus_location)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  verified_campus public.campus_location;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.has_role(auth.uid(), 'student'::public.user_role) then
    raise exception 'Student access required';
  end if;

  select profile.campus into verified_campus
  from public.profiles profile
  where profile.id = auth.uid();

  if verified_campus is null or verified_campus is distinct from p_campus then
    raise exception 'The requested campus does not match the verified student profile';
  end if;
end;
$$;

revoke all on function private.safety_require_student_campus(public.campus_location) from public, anon, authenticated;

create or replace function public.safety_start_mobility_session(
  p_mode text,
  p_campus public.campus_location,
  p_transport_type text default null,
  p_vehicle_details text default null,
  p_destination_label text default null,
  p_expected_end_at timestamptz default null,
  p_share_scope text default 'trusted_circle'
)
returns public.safety_mobility_sessions
language plpgsql
security definer
set search_path = public, private
as $$
declare
  session_row public.safety_mobility_sessions;
begin
  perform private.safety_require_student_campus(p_campus);
  if p_mode not in ('in_transit', 'night_travel', 'find_my_phone') then raise exception 'Unsupported mobility mode'; end if;
  if p_share_scope not in ('private', 'trusted_circle', 'campus_security') then raise exception 'Unsupported sharing scope'; end if;
  if p_expected_end_at is not null and p_expected_end_at <= now() then raise exception 'Expected end time must be in the future'; end if;

  update public.safety_mobility_sessions
  set status = 'completed', ended_at = now(), updated_at = now()
  where user_id = auth.uid() and status in ('active', 'paused');

  insert into public.safety_mobility_sessions (
    user_id, campus, mode, transport_type, vehicle_details,
    destination_label, expected_end_at, share_scope
  ) values (
    auth.uid(), p_campus, p_mode, nullif(btrim(p_transport_type), ''),
    nullif(btrim(p_vehicle_details), ''), nullif(btrim(p_destination_label), ''),
    p_expected_end_at, p_share_scope
  ) returning * into session_row;

  insert into public.safety_mobility_events(session_id, user_id, event_type, details)
  values (session_row.id, auth.uid(), 'started', jsonb_build_object('mode', p_mode, 'share_scope', p_share_scope));

  return session_row;
end;
$$;

create or replace function public.safety_set_student_presence(
  p_campus public.campus_location,
  p_visibility text,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_meters double precision default null,
  p_zone_label text default null,
  p_status_message text default null,
  p_sharing_until timestamptz default null,
  p_confirm_exact boolean default false
)
returns public.student_safety_presence
language plpgsql
security definer
set search_path = public, private
as $$
declare
  presence_row public.student_safety_presence;
begin
  perform private.safety_require_student_campus(p_campus);
  if p_visibility not in ('off', 'campus_approximate', 'campus_exact') then raise exception 'Unsupported visibility'; end if;
  if p_visibility = 'campus_exact' and not p_confirm_exact then raise exception 'Exact-location consent is required'; end if;
  if (p_latitude is null) <> (p_longitude is null) then raise exception 'Latitude and longitude must be supplied together'; end if;
  if p_sharing_until is not null and p_sharing_until <= now() then raise exception 'Sharing end time must be in the future'; end if;

  insert into public.student_safety_presence (
    user_id, campus, visibility, latitude, longitude, accuracy_meters,
    zone_label, status_message, sharing_until, exact_location_consent_at, last_seen_at
  ) values (
    auth.uid(), p_campus, p_visibility, p_latitude, p_longitude, p_accuracy_meters,
    nullif(btrim(p_zone_label), ''), nullif(btrim(p_status_message), ''), p_sharing_until,
    case when p_visibility = 'campus_exact' then now() else null end,
    case when p_visibility = 'off' then null else now() end
  )
  on conflict (user_id) do update set
    campus = excluded.campus,
    visibility = excluded.visibility,
    latitude = case when excluded.visibility = 'off' then null else excluded.latitude end,
    longitude = case when excluded.visibility = 'off' then null else excluded.longitude end,
    accuracy_meters = case when excluded.visibility = 'off' then null else excluded.accuracy_meters end,
    zone_label = excluded.zone_label,
    status_message = excluded.status_message,
    sharing_until = excluded.sharing_until,
    exact_location_consent_at = case when excluded.visibility = 'campus_exact' then now() else null end,
    last_seen_at = case when excluded.visibility = 'off' then null else now() end,
    updated_at = now()
  returning * into presence_row;

  return presence_row;
end;
$$;

create or replace function public.safety_list_campus_radar(p_campus public.campus_location)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  campus public.campus_location,
  visibility text,
  status_message text,
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  zone_label text,
  last_seen_at timestamptz,
  is_exact boolean
)
language plpgsql
security definer
stable
set search_path = public, private
as $$
begin
  perform private.safety_require_student_campus(p_campus);

  return query
  select
    presence.user_id,
    coalesce(profile.full_name, concat_ws(' ', profile.first_name, profile.last_name), 'TUT Student')::text,
    profile.avatar_url,
    presence.campus,
    presence.visibility,
    presence.status_message,
    case when presence.user_id = auth.uid() or presence.visibility = 'campus_exact'
      then presence.latitude else round(presence.latitude::numeric, 3)::double precision end,
    case when presence.user_id = auth.uid() or presence.visibility = 'campus_exact'
      then presence.longitude else round(presence.longitude::numeric, 3)::double precision end,
    case when presence.user_id = auth.uid() or presence.visibility = 'campus_exact'
      then presence.accuracy_meters else greatest(coalesce(presence.accuracy_meters, 0), 120) end,
    presence.zone_label,
    presence.last_seen_at,
    (presence.user_id = auth.uid() or presence.visibility = 'campus_exact')
  from public.student_safety_presence presence
  join public.profiles profile on profile.id = presence.user_id
  where presence.campus = p_campus
    and presence.visibility <> 'off'
    and presence.latitude is not null
    and presence.longitude is not null
    and presence.last_seen_at > now() - interval '15 minutes'
    and (presence.sharing_until is null or presence.sharing_until > now())
  order by (presence.user_id = auth.uid()) desc, presence.last_seen_at desc
  limit 60;
end;
$$;

revoke all on function public.safety_start_mobility_session(text, public.campus_location, text, text, text, timestamptz, text) from public, anon;
revoke all on function public.safety_update_mobility_location(uuid, double precision, double precision, double precision, double precision, double precision, numeric, text) from public, anon;
revoke all on function public.safety_end_mobility_session(uuid, text) from public, anon;
revoke all on function public.safety_trigger_mobility_alert(uuid, text) from public, anon;
revoke all on function public.safety_set_student_presence(public.campus_location, text, double precision, double precision, double precision, text, text, timestamptz, boolean) from public, anon;
revoke all on function public.safety_list_campus_radar(public.campus_location) from public, anon;

grant execute on function public.safety_start_mobility_session(text, public.campus_location, text, text, text, timestamptz, text) to authenticated;
grant execute on function public.safety_update_mobility_location(uuid, double precision, double precision, double precision, double precision, double precision, numeric, text) to authenticated;
grant execute on function public.safety_end_mobility_session(uuid, text) to authenticated;
grant execute on function public.safety_trigger_mobility_alert(uuid, text) to authenticated;
grant execute on function public.safety_set_student_presence(public.campus_location, text, double precision, double precision, double precision, text, text, timestamptz, boolean) to authenticated;
grant execute on function public.safety_list_campus_radar(public.campus_location) to authenticated;
