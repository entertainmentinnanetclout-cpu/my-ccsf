-- Evidence resilience phases C-E: evidence-first finalisation, receipts and audited access.

create table if not exists public.evidence_submission_drafts (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('official', 'pilot')),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  program_id uuid references public.pilot_programs(id) on delete cascade,
  session_id uuid references public.pilot_sessions(id) on delete cascade,
  participant_id uuid references public.pilot_participants(id) on delete cascade,
  scenario_id uuid references public.pilot_scenarios(id) on delete set null,
  campus public.campus_location,
  payload jsonb not null default '{}'::jsonb,
  required_evidence boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'uploading', 'ready', 'finalized', 'abandoned', 'expired')),
  evidence_count integer not null default 0 check (evidence_count between 0 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  finalized_at timestamptz
);

create index if not exists evidence_submission_drafts_user_status_idx
  on public.evidence_submission_drafts(user_id, status, created_at desc);
create index if not exists evidence_submission_drafts_expiry_idx
  on public.evidence_submission_drafts(expires_at) where status not in ('finalized', 'abandoned', 'expired');

alter table public.evidence_submission_drafts enable row level security;

drop policy if exists evidence_submission_drafts_select_own on public.evidence_submission_drafts;
create policy evidence_submission_drafts_select_own on public.evidence_submission_drafts
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists evidence_submission_drafts_insert_own on public.evidence_submission_drafts;
create policy evidence_submission_drafts_insert_own on public.evidence_submission_drafts
for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists evidence_submission_drafts_update_own on public.evidence_submission_drafts;
create policy evidence_submission_drafts_update_own on public.evidence_submission_drafts
for update to authenticated
using (user_id = (select auth.uid()) and status in ('draft', 'uploading', 'ready'))
with check (user_id = (select auth.uid()));

drop policy if exists evidence_submission_drafts_delete_own on public.evidence_submission_drafts;
create policy evidence_submission_drafts_delete_own on public.evidence_submission_drafts
for delete to authenticated using (user_id = (select auth.uid()) and status <> 'finalized');

create table if not exists public.submission_receipts (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('official', 'pilot')),
  user_id uuid not null references auth.users(id) on delete cascade,
  incident_id uuid references public.incidents(id) on delete cascade,
  pilot_report_id uuid references public.pilot_reports(id) on delete cascade,
  reference_number text not null,
  campus public.campus_location,
  evidence_count integer not null default 0,
  submitted_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  constraint submission_receipts_one_record check (
    (scope = 'official' and incident_id is not null and pilot_report_id is null)
    or (scope = 'pilot' and pilot_report_id is not null and incident_id is null)
  )
);

create unique index if not exists submission_receipts_official_unique on public.submission_receipts(incident_id) where incident_id is not null;
create unique index if not exists submission_receipts_pilot_unique on public.submission_receipts(pilot_report_id) where pilot_report_id is not null;
create index if not exists submission_receipts_user_idx on public.submission_receipts(user_id, submitted_at desc);

alter table public.submission_receipts enable row level security;
drop policy if exists submission_receipts_select_own_or_staff on public.submission_receipts;
create policy submission_receipts_select_own_or_staff on public.submission_receipts
for select to authenticated using (
  user_id = (select auth.uid())
  or public.is_super_admin((select auth.uid()))
  or (public.is_campus_admin((select auth.uid())) and campus = public.get_user_campus((select auth.uid())))
);

create table if not exists public.evidence_access_audit (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('official', 'pilot', 'pilot_review')),
  bucket_id text not null,
  object_path text not null,
  incident_id uuid references public.incidents(id) on delete set null,
  pilot_report_id uuid references public.pilot_reports(id) on delete set null,
  actor_id uuid not null references auth.users(id) on delete cascade,
  actor_role text not null,
  actor_campus public.campus_location,
  action text not null check (action in ('preview', 'download')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists evidence_access_audit_record_idx on public.evidence_access_audit(incident_id, pilot_report_id, created_at desc);
create index if not exists evidence_access_audit_actor_idx on public.evidence_access_audit(actor_id, created_at desc);

alter table public.evidence_access_audit enable row level security;
drop policy if exists evidence_access_audit_select_staff on public.evidence_access_audit;
create policy evidence_access_audit_select_staff on public.evidence_access_audit
for select to authenticated using (
  public.is_super_admin((select auth.uid()))
  or (public.is_campus_admin((select auth.uid())) and actor_campus = public.get_user_campus((select auth.uid())))
);

alter table public.incident_media add column if not exists original_filename text;
alter table public.incident_media add column if not exists checksum text;

create or replace function public.create_evidence_submission_draft(
  p_scope text,
  p_payload jsonb,
  p_required_evidence boolean default false,
  p_program_id uuid default null,
  p_session_id uuid default null,
  p_participant_id uuid default null,
  p_scenario_id uuid default null,
  p_campus public.campus_location default null
) returns public.evidence_submission_drafts
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_user uuid := auth.uid();
  v_row public.evidence_submission_drafts;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_scope not in ('official', 'pilot') then raise exception 'Invalid submission scope'; end if;
  if jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object' then raise exception 'Submission payload must be an object'; end if;

  if p_scope = 'pilot' then
    if p_program_id is null or p_session_id is null or p_participant_id is null then
      raise exception 'Pilot submission context is incomplete';
    end if;
    if not private.pilot_owns_session(v_user, p_session_id) then raise exception 'Pilot session is not owned by this user'; end if;
    if not exists (
      select 1 from public.pilot_participants pp
      where pp.id = p_participant_id and pp.user_id = v_user and pp.program_id = p_program_id
        and pp.status in ('consented', 'active')
    ) then raise exception 'Pilot participation is not active'; end if;
  end if;

  insert into public.evidence_submission_drafts(
    scope, user_id, program_id, session_id, participant_id, scenario_id, campus, payload, required_evidence
  ) values (
    p_scope, v_user, p_program_id, p_session_id, p_participant_id, p_scenario_id,
    coalesce(p_campus, public.get_user_campus(v_user)), coalesce(p_payload, '{}'::jsonb), coalesce(p_required_evidence, false)
  ) returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.create_evidence_submission_draft(text, jsonb, boolean, uuid, uuid, uuid, uuid, public.campus_location) from public, anon;
grant execute on function public.create_evidence_submission_draft(text, jsonb, boolean, uuid, uuid, uuid, uuid, public.campus_location) to authenticated;

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
  v_checksum text;
  v_name text;
  v_count integer;
  v_reference text;
  v_receipt public.submission_receipts;
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
    v_mime := v_item->>'mime_type';
    v_size := nullif(v_item->>'size_bytes', '')::bigint;
    v_checksum := nullif(v_item->>'checksum', '');
    v_name := nullif(v_item->>'original_filename', '');
    if v_path is null or v_path !~ ('^drafts/' || v_user::text || '/' || p_submission_id::text || '/[^/]+$') then
      raise exception 'Evidence path is outside the owned submission draft';
    end if;
    if v_mime not in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf') then
      raise exception 'Unsupported evidence type';
    end if;
    if v_size is null or v_size <= 0 or v_size > 10485760 then raise exception 'Invalid evidence size'; end if;
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
    trim(v_draft.payload->>'title'),
    trim(v_draft.payload->>'description'),
    (v_draft.payload->>'category')::public.incident_category,
    coalesce((v_draft.payload->>'is_anonymous')::boolean, false),
    nullif(v_draft.payload->>'location_lat', '')::double precision,
    nullif(v_draft.payload->>'location_lng', '')::double precision,
    nullif(trim(v_draft.payload->>'location_description'), ''),
    case when coalesce((v_draft.payload->>'is_anonymous')::boolean, false) then null else v_user end,
    v_user,
    v_draft.campus,
    case when coalesce((v_draft.payload->>'is_anonymous')::boolean, false) then null else nullif(v_draft.payload->>'signature_data', '') end
  ) returning * into v_incident;

  for v_item in select value from jsonb_array_elements(coalesce(p_evidence, '[]'::jsonb)) loop
    insert into public.incident_media(incident_id, media_url, media_type, file_size, original_filename, checksum)
    values (
      v_incident.id,
      v_item->>'path',
      v_item->>'mime_type',
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

-- Allow evidence to be uploaded before the official incident row is finalised.
drop policy if exists "Authorised users can upload incident media" on storage.objects;
create policy "Authorised users can upload incident media" on storage.objects
for insert to authenticated with check (
  bucket_id = 'incident-media'
  and (
    (
      (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and exists (
        select 1 from public.incidents i
        where i.id = ((storage.foldername(name))[1])::uuid
          and (i.submitted_by = (select auth.uid()) or i.reporter_id = (select auth.uid()) or i.assigned_to = (select auth.uid())
            or public.is_super_admin((select auth.uid()))
            or (public.is_campus_admin((select auth.uid())) and i.campus = public.get_user_campus((select auth.uid()))))
      )
    )
    or (
      (storage.foldername(name))[1] = 'drafts'
      and (storage.foldername(name))[2] = (select auth.uid())::text
      and exists (
        select 1 from public.evidence_submission_drafts d
        where d.id::text = (storage.foldername(name))[3]
          and d.user_id = (select auth.uid()) and d.scope = 'official'
          and d.status in ('draft', 'uploading', 'ready') and d.expires_at > now()
      )
    )
  )
);

drop policy if exists "Authorised users can view incident media" on storage.objects;
create policy "Authorised users can view incident media" on storage.objects
for select to authenticated using (
  bucket_id = 'incident-media'
  and exists (
    select 1 from public.incident_media im
    join public.incidents i on i.id = im.incident_id
    where im.media_url = storage.objects.name
      and (i.submitted_by = (select auth.uid()) or i.reporter_id = (select auth.uid()) or i.assigned_to = (select auth.uid())
        or public.is_super_admin((select auth.uid()))
        or (public.is_campus_admin((select auth.uid())) and i.campus = public.get_user_campus((select auth.uid()))))
  )
);

drop policy if exists evidence_draft_objects_delete_own on storage.objects;
create policy evidence_draft_objects_delete_own on storage.objects
for delete to authenticated using (
  bucket_id = 'incident-media'
  and (storage.foldername(name))[1] = 'drafts'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1 from public.evidence_submission_drafts d
    where d.id::text = (storage.foldername(name))[3] and d.user_id = (select auth.uid()) and d.status <> 'finalized'
  )
);

-- Pilot evidence uses the future report UUID as the fourth path segment.
drop policy if exists pilot_attachment_objects_insert on storage.objects;
create policy pilot_attachment_objects_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'pilot-report-attachments'
  and name ~ '^[0-9a-f-]{36}/[a-z0-9_]+/[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$'
  and split_part(name, '/', 3) = (select auth.uid())::text
  and (
    exists (
      select 1 from public.pilot_reports pr
      where pr.id::text = split_part(name, '/', 4)
        and pr.program_id::text = split_part(name, '/', 1)
        and pr.campus::text = split_part(name, '/', 2)
        and pr.submitted_by = (select auth.uid())
    )
    or exists (
      select 1 from public.evidence_submission_drafts d
      where d.id::text = split_part(name, '/', 4)
        and d.program_id::text = split_part(name, '/', 1)
        and d.campus::text = split_part(name, '/', 2)
        and d.user_id = (select auth.uid())
        and d.scope = 'pilot' and d.status in ('draft', 'uploading', 'ready') and d.expires_at > now()
    )
  )
);

drop policy if exists pilot_attachment_draft_objects_delete_own on storage.objects;
create policy pilot_attachment_draft_objects_delete_own on storage.objects
for delete to authenticated using (
  bucket_id = 'pilot-report-attachments'
  and split_part(name, '/', 3) = (select auth.uid())::text
  and exists (
    select 1 from public.evidence_submission_drafts d
    where d.id::text = split_part(name, '/', 4) and d.user_id = (select auth.uid()) and d.scope = 'pilot' and d.status <> 'finalized'
  )
);

comment on table public.evidence_submission_drafts is 'Short-lived evidence-first and offline-resumable report submissions. Payload and objects expire after 24 hours unless finalised.';
comment on table public.submission_receipts is 'Formal student-facing proof that an official or Pilot report reached the authorised CCSF workflow.';
comment on table public.evidence_access_audit is 'Append-only audit of authorised private evidence previews and downloads.';
