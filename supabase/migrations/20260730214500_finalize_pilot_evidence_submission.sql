create or replace function public.finalize_pilot_evidence_submission(
  p_submission_id uuid,
  p_actor_id uuid,
  p_title text,
  p_description text,
  p_category public.incident_category,
  p_is_anonymous boolean,
  p_location_lat numeric default null,
  p_location_lng numeric default null,
  p_location_accuracy numeric default null,
  p_location_description text default null,
  p_evidence jsonb default '[]'::jsonb,
  p_submitted_offline boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public, private, storage, auth
as $$
declare
  v_draft public.evidence_submission_drafts;
  v_report public.pilot_reports;
  v_receipt public.submission_receipts;
  v_item jsonb;
  v_path text;
  v_mime text;
  v_size bigint;
  v_count integer;
  v_prefix text;
begin
  if p_actor_id is null then raise exception 'Pilot actor is required'; end if;
  if jsonb_typeof(coalesce(p_evidence, '[]'::jsonb)) <> 'array' then raise exception 'Evidence manifest must be an array'; end if;

  select * into v_draft
  from public.evidence_submission_drafts
  where id = p_submission_id and user_id = p_actor_id and scope = 'pilot'
  for update;

  if not found then raise exception 'Pilot evidence submission draft not found'; end if;
  if v_draft.status = 'finalized' then
    select pr.* into v_report from public.pilot_reports pr where pr.id = p_submission_id;
    select sr.* into v_receipt from public.submission_receipts sr where sr.pilot_report_id = p_submission_id;
    if v_report.id is not null and v_receipt.id is not null then
      return jsonb_build_object('report', to_jsonb(v_report), 'receipt', to_jsonb(v_receipt));
    end if;
    raise exception 'Pilot evidence submission is already finalised';
  end if;
  if v_draft.expires_at <= now() then
    update public.evidence_submission_drafts set status = 'expired', updated_at = now() where id = v_draft.id;
    raise exception 'Pilot evidence submission has expired';
  end if;
  if v_draft.program_id is null or v_draft.session_id is null or v_draft.participant_id is null or v_draft.campus is null then
    raise exception 'Pilot evidence submission context is incomplete';
  end if;
  if not exists (
    select 1 from public.pilot_sessions ps
    where ps.id = v_draft.session_id and ps.user_id = p_actor_id and ps.participant_id = v_draft.participant_id
      and ps.program_id = v_draft.program_id and ps.campus = v_draft.campus
      and ps.status = 'in_progress' and ps.expires_at > now()
  ) then raise exception 'An active owned Pilot session is required'; end if;
  if not exists (
    select 1 from public.pilot_participants pp
    where pp.id = v_draft.participant_id and pp.user_id = p_actor_id and pp.program_id = v_draft.program_id
      and pp.campus = v_draft.campus and pp.status in ('consented', 'active')
  ) then raise exception 'Pilot participation is not active'; end if;

  v_count := jsonb_array_length(coalesce(p_evidence, '[]'::jsonb));
  if v_count > 3 then raise exception 'A maximum of three evidence files is allowed'; end if;
  if v_draft.required_evidence and v_count = 0 then raise exception 'Evidence is required for this Pilot scenario'; end if;
  v_prefix := v_draft.program_id::text || '/' || v_draft.campus::text || '/' || p_actor_id::text || '/' || v_draft.id::text || '/';

  for v_item in select value from jsonb_array_elements(coalesce(p_evidence, '[]'::jsonb)) loop
    v_path := v_item->>'path';
    v_mime := v_item->>'mime_type';
    v_size := nullif(v_item->>'size_bytes', '')::bigint;
    if v_path is null or left(v_path, length(v_prefix)) <> v_prefix or position('/' in substr(v_path, length(v_prefix) + 1)) > 0 then
      raise exception 'Pilot evidence path is outside the owned submission';
    end if;
    if v_mime not in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf') then
      raise exception 'Unsupported Pilot evidence type';
    end if;
    if v_size is null or v_size <= 0 or v_size > 10485760 then raise exception 'Invalid Pilot evidence size'; end if;
    if not exists (
      select 1 from storage.objects so
      where so.bucket_id = 'pilot-report-attachments' and so.name = v_path
    ) then raise exception 'An uploaded Pilot evidence object could not be verified'; end if;
  end loop;

  insert into public.pilot_reports(
    id, program_id, session_id, scenario_id, participant_id, submitted_by, campus,
    reference_number, title, description, category, is_anonymous,
    location_lat, location_lng, location_accuracy, location_description
  ) values (
    v_draft.id, v_draft.program_id, v_draft.session_id, v_draft.scenario_id, v_draft.participant_id,
    p_actor_id, v_draft.campus, '', trim(p_title), trim(p_description), p_category, coalesce(p_is_anonymous, false),
    p_location_lat, p_location_lng, p_location_accuracy, nullif(trim(p_location_description), '')
  ) returning * into v_report;

  for v_item in select value from jsonb_array_elements(coalesce(p_evidence, '[]'::jsonb)) loop
    insert into public.pilot_attachments(
      program_id, session_id, report_id, uploaded_by, storage_path,
      original_filename, mime_type, size_bytes, checksum
    ) values (
      v_report.program_id, v_report.session_id, v_report.id, p_actor_id, v_item->>'path',
      nullif(v_item->>'original_filename', ''), v_item->>'mime_type',
      (v_item->>'size_bytes')::bigint, nullif(v_item->>'checksum', '')
    );
  end loop;

  insert into public.submission_receipts(
    scope, user_id, pilot_report_id, reference_number, campus, evidence_count, payload
  ) values (
    'pilot', p_actor_id, v_report.id, v_report.reference_number, v_report.campus, v_count,
    jsonb_build_object(
      'category', v_report.category,
      'anonymous', v_report.is_anonymous,
      'submitted_offline', coalesce(p_submitted_offline, false),
      'status', v_report.status,
      'simulation_only', true
    )
  ) returning * into v_receipt;

  update public.evidence_submission_drafts
  set status = 'finalized', evidence_count = v_count, finalized_at = now(), updated_at = now()
  where id = v_draft.id;

  return jsonb_build_object('report', to_jsonb(v_report), 'receipt', to_jsonb(v_receipt));
end;
$$;

revoke all on function public.finalize_pilot_evidence_submission(
  uuid, uuid, text, text, public.incident_category, boolean, numeric, numeric, numeric, text, jsonb, boolean
) from public, anon, authenticated;
grant execute on function public.finalize_pilot_evidence_submission(
  uuid, uuid, text, text, public.incident_category, boolean, numeric, numeric, numeric, text, jsonb, boolean
) to service_role;

comment on function public.finalize_pilot_evidence_submission is 'Atomically verifies pre-uploaded private Pilot evidence, creates the isolated report, attachment metadata and formal receipt, then closes the short-lived submission draft.';
