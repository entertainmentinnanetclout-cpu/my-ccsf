-- My CCSF institutional hardening — Phase 1
-- Security boundaries, emergency routing, evidence compatibility and location quality.

-- ---------------------------------------------------------------------------
-- 1. Incident workflow integrity
-- Students may create cases and update live location fields, but may not alter
-- institutional workflow fields such as status, assignment or resolution.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_incident_workflow_integrity()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_staff boolean := false;
begin
  if v_actor is null then
    return new;
  end if;

  v_staff := public.is_super_admin(v_actor) or public.is_campus_admin(v_actor);
  if v_staff then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.submitted_by := v_actor;
    new.reporter_id := case when coalesce(new.is_anonymous, false) then null else v_actor end;
    new.campus := public.get_user_campus(v_actor);
    if new.campus is null then
      raise exception 'A verified campus profile is required before submitting a case';
    end if;
    new.status := 'pending'::public.incident_status;
    new.assigned_to := null;
    new.resolved_at := null;
    new.resolved_by := null;
    new.resolution_notes := null;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if old.submitted_by = v_actor or old.reporter_id = v_actor then
    if row(
      new.title,
      new.description,
      new.category,
      new.status,
      new.is_anonymous,
      new.reporter_id,
      new.submitted_by,
      new.assigned_to,
      new.resolved_at,
      new.resolved_by,
      new.resolution_notes,
      new.signature_data,
      new.campus,
      new.created_at
    ) is distinct from row(
      old.title,
      old.description,
      old.category,
      old.status,
      old.is_anonymous,
      old.reporter_id,
      old.submitted_by,
      old.assigned_to,
      old.resolved_at,
      old.resolved_by,
      old.resolution_notes,
      old.signature_data,
      old.campus,
      old.created_at
    ) then
      raise exception 'Submitted case workflow fields are controlled by authorised CCSF/CPS staff';
    end if;

    if new.location_lat is not null and new.location_lat not between -90 and 90 then
      raise exception 'Invalid latitude';
    end if;
    if new.location_lng is not null and new.location_lng not between -180 and 180 then
      raise exception 'Invalid longitude';
    end if;
    if (new.location_lat is null) <> (new.location_lng is null) then
      raise exception 'Latitude and longitude must be supplied together';
    end if;
    new.updated_at := now();
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_incident_workflow_integrity() from public, anon, authenticated;

drop trigger if exists incidents_workflow_integrity on public.incidents;
create trigger incidents_workflow_integrity
before insert or update on public.incidents
for each row execute function public.enforce_incident_workflow_integrity();

-- ---------------------------------------------------------------------------
-- 2. Evidence draft payload and campus integrity
-- ---------------------------------------------------------------------------
create or replace function public.enforce_evidence_submission_integrity()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_title text;
  v_description text;
  v_signature text;
  v_lat double precision;
  v_lng double precision;
  v_participant_campus public.campus_location;
begin
  if jsonb_typeof(coalesce(new.payload, '{}'::jsonb)) <> 'object' then
    raise exception 'Submission payload must be an object';
  end if;

  if new.scope = 'official' then
    new.user_id := auth.uid();
    if new.user_id is null then raise exception 'Authentication required'; end if;
    new.campus := public.get_user_campus(new.user_id);
    if new.campus is null then raise exception 'A verified campus profile is required'; end if;

    v_title := btrim(coalesce(new.payload->>'title', ''));
    v_description := btrim(coalesce(new.payload->>'description', ''));
    v_signature := coalesce(new.payload->>'signature_data', '');

    if char_length(v_title) not between 5 and 160 then
      raise exception 'Report title must contain between 5 and 160 characters';
    end if;
    if char_length(v_description) not between 20 and 10000 then
      raise exception 'Report description must contain between 20 and 10000 characters';
    end if;
    if char_length(coalesce(new.payload->>'location_description', '')) > 1000 then
      raise exception 'Location description is too long';
    end if;
    if octet_length(v_signature) > 600000 then
      raise exception 'Signature data is too large';
    end if;

    begin
      perform (new.payload->>'category')::public.incident_category;
    exception when others then
      raise exception 'Invalid incident category';
    end;

    if nullif(new.payload->>'location_lat', '') is not null then
      v_lat := (new.payload->>'location_lat')::double precision;
      v_lng := (new.payload->>'location_lng')::double precision;
      if v_lat not between -90 and 90 or v_lng not between -180 and 180 then
        raise exception 'Invalid report coordinates';
      end if;
    elsif nullif(new.payload->>'location_lng', '') is not null then
      raise exception 'Latitude and longitude must be supplied together';
    end if;
  elsif new.scope = 'pilot' then
    if new.user_id <> auth.uid() then raise exception 'Pilot draft ownership mismatch'; end if;
    select pp.campus into v_participant_campus
    from public.pilot_participants pp
    where pp.id = new.participant_id
      and pp.user_id = new.user_id
      and pp.program_id = new.program_id
      and pp.status in ('consented', 'active');
    if v_participant_campus is null then raise exception 'Pilot participation is not active'; end if;
    new.campus := v_participant_campus;
  else
    raise exception 'Invalid submission scope';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.enforce_evidence_submission_integrity() from public, anon, authenticated;

drop trigger if exists evidence_submission_integrity on public.evidence_submission_drafts;
create trigger evidence_submission_integrity
before insert or update on public.evidence_submission_drafts
for each row execute function public.enforce_evidence_submission_integrity();

-- Support modern iOS/Android video evidence while retaining strict limits.
update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/3gpp2',
      'application/pdf'
    ]::text[]
where id in ('incident-media', 'pilot-report-attachments');

create or replace function public.finalize_official_evidence_submission(
  p_submission_id uuid,
  p_evidence jsonb default '[]'::jsonb,
  p_submitted_offline boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public, storage, auth
as $$
declare
  v_user uuid := auth.uid();
  v_draft public.evidence_submission_drafts;
  v_incident public.incidents;
  v_item jsonb;
  v_path text;
  v_mime text;
  v_size bigint;
  v_count integer;
  v_reference text;
  v_receipt public.submission_receipts;
  v_max_size bigint;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(coalesce(p_evidence, '[]'::jsonb)) <> 'array' then raise exception 'Evidence manifest must be an array'; end if;

  select * into v_draft from public.evidence_submission_drafts
  where id = p_submission_id and user_id = v_user and scope = 'official'
  for update;
  if not found then raise exception 'Submission draft not found'; end if;
  if v_draft.status = 'finalized' then raise exception 'Submission has already been finalized'; end if;
  if v_draft.expires_at <= now() then
    update public.evidence_submission_drafts set status = 'expired', updated_at = now() where id = v_draft.id;
    raise exception 'Submission draft has expired';
  end if;

  v_count := jsonb_array_length(coalesce(p_evidence, '[]'::jsonb));
  if v_count > 3 then raise exception 'A maximum of three evidence files is allowed'; end if;
  if v_draft.required_evidence and v_count = 0 then raise exception 'Evidence is required for this submission'; end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_evidence, '[]'::jsonb)) loop
    v_path := v_item->>'path';
    v_mime := lower(v_item->>'mime_type');
    v_size := nullif(v_item->>'size_bytes', '')::bigint;
    if v_path is null or v_path !~ ('^drafts/' || v_user::text || '/' || p_submission_id::text || '/[^/]+$') then
      raise exception 'Evidence path is outside the owned submission draft';
    end if;
    if v_mime not in (
      'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/3gpp2',
      'application/pdf'
    ) then raise exception 'Unsupported evidence type'; end if;
    v_max_size := case when v_mime like 'video/%' then 26214400 else 10485760 end;
    if v_size is null or v_size <= 0 or v_size > v_max_size then raise exception 'Invalid evidence size'; end if;
    if not exists (
      select 1 from storage.objects so
      where so.bucket_id = 'incident-media' and so.name = v_path
        and coalesce((so.metadata->>'size')::bigint, v_size) = v_size
    ) then raise exception 'An uploaded evidence object could not be verified'; end if;
  end loop;

  insert into public.incidents(
    id, title, description, category, is_anonymous, location_lat, location_lng,
    location_description, reporter_id, submitted_by, campus, signature_data
  ) values (
    p_submission_id,
    btrim(v_draft.payload->>'title'),
    btrim(v_draft.payload->>'description'),
    (v_draft.payload->>'category')::public.incident_category,
    coalesce((v_draft.payload->>'is_anonymous')::boolean, false),
    nullif(v_draft.payload->>'location_lat', '')::double precision,
    nullif(v_draft.payload->>'location_lng', '')::double precision,
    nullif(btrim(v_draft.payload->>'location_description'), ''),
    case when coalesce((v_draft.payload->>'is_anonymous')::boolean, false) then null else v_user end,
    v_user,
    public.get_user_campus(v_user),
    case when coalesce((v_draft.payload->>'is_anonymous')::boolean, false) then null else nullif(v_draft.payload->>'signature_data', '') end
  ) returning * into v_incident;

  for v_item in select value from jsonb_array_elements(coalesce(p_evidence, '[]'::jsonb)) loop
    insert into public.incident_media(incident_id, media_url, media_type, file_size, original_filename, checksum)
    values (
      v_incident.id,
      v_item->>'path',
      lower(v_item->>'mime_type'),
      (v_item->>'size_bytes')::integer,
      nullif(v_item->>'original_filename', ''),
      nullif(v_item->>'checksum', '')
    );
  end loop;

  v_reference := 'CCSF-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(v_incident.id::text, '-', ''), 1, 8));
  insert into public.submission_receipts(scope, user_id, incident_id, reference_number, campus, evidence_count, payload)
  values (
    'official', v_user, v_incident.id, v_reference, v_incident.campus, v_count,
    jsonb_build_object(
      'category', v_incident.category,
      'anonymous', v_incident.is_anonymous,
      'submitted_offline', coalesce(p_submitted_offline, false),
      'status', v_incident.status
    )
  ) returning * into v_receipt;

  update public.evidence_submission_drafts
  set status = 'finalized', evidence_count = v_count, finalized_at = now(), updated_at = now()
  where id = v_draft.id;

  return jsonb_build_object('incident', to_jsonb(v_incident), 'receipt', to_jsonb(v_receipt));
end;
$$;

revoke all on function public.finalize_official_evidence_submission(uuid, jsonb, boolean) from public, anon;
grant execute on function public.finalize_official_evidence_submission(uuid, jsonb, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Emergency creation and location updates through vetted server functions
-- ---------------------------------------------------------------------------
create or replace function public.create_emergency_alert(
  p_category public.incident_category,
  p_reason text,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_meters double precision default null,
  p_location_description text default null
) returns public.incidents
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_campus public.campus_location;
  v_incident public.incidents;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  v_campus := public.get_user_campus(v_user);
  if v_campus is null then raise exception 'A verified campus profile is required'; end if;
  if p_category not in (
    'Public violence'::public.incident_category,
    'Assault common'::public.incident_category,
    'Assault GBH'::public.incident_category,
    'Gbv'::public.incident_category,
    'Armed robbery'::public.incident_category,
    'Arson'::public.incident_category,
    'Attempted murder'::public.incident_category
  ) then raise exception 'Unsupported emergency category'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 5 and 1000 then
    raise exception 'Emergency details must contain between 5 and 1000 characters';
  end if;
  if (p_latitude is null) <> (p_longitude is null) then raise exception 'Latitude and longitude must be supplied together'; end if;
  if p_latitude is not null and (p_latitude not between -90 and 90 or p_longitude not between -180 and 180) then raise exception 'Invalid emergency coordinates'; end if;
  if p_accuracy_meters is not null and p_accuracy_meters not between 0 and 5000 then raise exception 'Invalid location accuracy'; end if;

  insert into public.incidents(
    title, description, category, status, is_anonymous,
    location_lat, location_lng, location_description,
    reporter_id, submitted_by, campus
  ) values (
    'Emergency safety alert', btrim(p_reason), p_category, 'pending', false,
    p_latitude, p_longitude, left(nullif(btrim(p_location_description), ''), 1000),
    v_user, v_user, v_campus
  ) returning * into v_incident;

  if p_latitude is not null then
    insert into public.incident_location_updates(
      incident_id, location_lat, location_lng, location_address, accuracy_meters
    ) values (
      v_incident.id, p_latitude, p_longitude,
      coalesce(left(nullif(btrim(p_location_description), ''), 1000), 'Emergency location'),
      p_accuracy_meters
    );
  end if;

  return v_incident;
end;
$$;

revoke all on function public.create_emergency_alert(public.incident_category, text, double precision, double precision, double precision, text) from public, anon;
grant execute on function public.create_emergency_alert(public.incident_category, text, double precision, double precision, double precision, text) to authenticated;

create or replace function public.record_emergency_location_update(
  p_incident_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision default null,
  p_location_description text default null
) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_incident public.incidents;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'Invalid coordinates'; end if;
  if p_accuracy_meters is not null and p_accuracy_meters not between 0 and 5000 then raise exception 'Invalid location accuracy'; end if;

  select * into v_incident from public.incidents
  where id = p_incident_id
    and (submitted_by = v_user or reporter_id = v_user)
    and status not in ('resolved', 'rejected')
  for update;
  if not found then raise exception 'Active emergency case not found'; end if;

  insert into public.incident_location_updates(
    incident_id, location_lat, location_lng, location_address, accuracy_meters
  ) values (
    p_incident_id, p_latitude, p_longitude,
    coalesce(left(nullif(btrim(p_location_description), ''), 1000), 'Live emergency location'),
    p_accuracy_meters
  );

  update public.incidents
  set location_lat = p_latitude,
      location_lng = p_longitude,
      location_description = coalesce(left(nullif(btrim(p_location_description), ''), 1000), 'Live emergency location'),
      updated_at = now()
  where id = p_incident_id;
end;
$$;

revoke all on function public.record_emergency_location_update(uuid, double precision, double precision, double precision, text) from public, anon;
grant execute on function public.record_emergency_location_update(uuid, double precision, double precision, double precision, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Location quality enforcement for Safety Mobility and Radar
-- ---------------------------------------------------------------------------
create or replace function public.enforce_safety_location_quality()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.latitude is not null and new.latitude not between -90 and 90 then raise exception 'Invalid latitude'; end if;
  if new.longitude is not null and new.longitude not between -180 and 180 then raise exception 'Invalid longitude'; end if;
  if (new.latitude is null) <> (new.longitude is null) then raise exception 'Latitude and longitude must be supplied together'; end if;
  if new.accuracy_meters is not null and new.accuracy_meters not between 0 and 5000 then raise exception 'Invalid location accuracy'; end if;

  if tg_table_name = 'student_safety_presence' then
    new.campus := public.get_user_campus(new.user_id);
    if new.visibility = 'campus_exact' then
      if new.latitude is null or new.accuracy_meters is null or new.accuracy_meters > 50 then
        raise exception 'Exact Radar sharing requires a fresh location accurate to 50 metres or better';
      end if;
    end if;
    if new.sharing_until is not null and new.sharing_until > now() + interval '24 hours' then
      raise exception 'Radar sharing may not exceed 24 hours';
    end if;
    new.zone_label := left(new.zone_label, 240);
    new.status_message := left(new.status_message, 120);
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_safety_location_quality() from public, anon, authenticated;

drop trigger if exists student_safety_presence_quality on public.student_safety_presence;
create trigger student_safety_presence_quality
before insert or update on public.student_safety_presence
for each row execute function public.enforce_safety_location_quality();

drop trigger if exists safety_location_updates_quality on public.safety_mobility_location_updates;
create trigger safety_location_updates_quality
before insert or update on public.safety_mobility_location_updates
for each row execute function public.enforce_safety_location_quality();

-- ---------------------------------------------------------------------------
-- 5. Remove dormant anonymous transfer access and improve hot-path indexes/RLS
-- ---------------------------------------------------------------------------
drop policy if exists "temporary brand transfer insert" on storage.objects;
drop policy if exists "temporary brand transfer delete" on storage.objects;

create index if not exists evidence_submission_drafts_program_idx on public.evidence_submission_drafts(program_id) where program_id is not null;
create index if not exists evidence_submission_drafts_session_idx on public.evidence_submission_drafts(session_id) where session_id is not null;
create index if not exists evidence_submission_drafts_participant_idx on public.evidence_submission_drafts(participant_id) where participant_id is not null;
create index if not exists evidence_submission_drafts_scenario_idx on public.evidence_submission_drafts(scenario_id) where scenario_id is not null;
create index if not exists evidence_access_audit_pilot_report_idx on public.evidence_access_audit(pilot_report_id) where pilot_report_id is not null;
create index if not exists safety_mobility_events_session_idx on public.safety_mobility_events(session_id);
create index if not exists safety_mobility_events_user_idx on public.safety_mobility_events(user_id);
create index if not exists safety_mobility_updates_user_idx on public.safety_mobility_location_updates(user_id);
create index if not exists safety_mobility_sessions_incident_idx on public.safety_mobility_sessions(incident_id) where incident_id is not null;

-- Restrict profile and avatar object mutations to signed-in users explicitly.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar" on storage.objects
for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar" on storage.objects
for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar" on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
