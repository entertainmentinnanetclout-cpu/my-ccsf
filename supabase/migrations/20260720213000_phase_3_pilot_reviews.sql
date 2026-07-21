do $$
begin
  create type public.pilot_review_status as enum ('submitted', 'under_review', 'responded', 'resolved', 'hidden', 'flagged');
exception when duplicate_object then null;
end $$;

create table if not exists public.pilot_reviews (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.pilot_programs(id) on delete cascade,
  participant_id uuid not null references public.pilot_participants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  campus public.campus_location not null,
  report_id uuid references public.pilot_reports(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  category text not null check (category in ('usability','location','reporting','case_updates','navigation','performance','broken_feature','other')),
  quick_feedback text[] not null default '{}'::text[] check (cardinality(quick_feedback) <= 10),
  review_text text not null default '' check (char_length(review_text) <= 5000),
  attachment_path text,
  device_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(device_metadata) = 'object'),
  contact_permission boolean not null default false,
  status public.pilot_review_status not null default 'submitted',
  admin_response text check (admin_response is null or char_length(admin_response) <= 5000),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_reviews_identity_consistency unique (id, program_id, participant_id, user_id),
  constraint pilot_reviews_response_pair check (
    (reviewed_by is null and reviewed_at is null)
    or (reviewed_by is not null and reviewed_at is not null)
  )
);

create index if not exists pilot_reviews_user_created_idx
  on public.pilot_reviews(user_id, created_at desc);
create index if not exists pilot_reviews_campus_status_idx
  on public.pilot_reviews(campus, status, created_at desc);
create index if not exists pilot_reviews_program_rating_idx
  on public.pilot_reviews(program_id, rating, created_at desc);
create index if not exists pilot_reviews_report_idx
  on public.pilot_reviews(report_id) where report_id is not null;

create or replace function private.pilot_review_program_is_open(
  p_program_id uuid,
  p_campus public.campus_location
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.pilot_programs pg
    where pg.id = p_program_id
      and pg.status = 'active'
      and (pg.starts_at is null or pg.starts_at <= now())
      and (pg.ends_at is null or pg.ends_at >= now())
      and p_campus = any(pg.eligible_campuses)
  )
$$;

create or replace function private.pilot_can_access_review(p_user_id uuid, p_review_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.pilot_reviews pr
    where pr.id = p_review_id
      and (
        pr.user_id = p_user_id
        or private.pilot_is_super_admin(p_user_id)
        or (
          private.pilot_is_security(p_user_id)
          and private.pilot_user_campus(p_user_id) = pr.campus
          and private.pilot_review_program_is_open(pr.program_id, pr.campus)
        )
      )
  )
$$;

create or replace function private.pilot_can_manage_review(p_user_id uuid, p_review_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.pilot_reviews pr
    where pr.id = p_review_id
      and (
        private.pilot_is_super_admin(p_user_id)
        or (
          private.pilot_is_security(p_user_id)
          and private.pilot_user_campus(p_user_id) = pr.campus
          and private.pilot_review_program_is_open(pr.program_id, pr.campus)
        )
      )
  )
$$;

create or replace function private.pilot_touch_review_updated_at()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists pilot_reviews_touch_updated_at on public.pilot_reviews;
create trigger pilot_reviews_touch_updated_at
before update on public.pilot_reviews
for each row execute function private.pilot_touch_review_updated_at();

create or replace function public.pilot_submit_review(
  p_rating integer,
  p_category text,
  p_quick_feedback text[] default '{}'::text[],
  p_review_text text default '',
  p_report_id uuid default null,
  p_attachment_path text default null,
  p_device_metadata jsonb default '{}'::jsonb,
  p_contact_permission boolean default false,
  p_review_id uuid default null
)
returns public.pilot_reviews
language plpgsql
security definer
set search_path = public, private, storage
as $$
declare
  v_user_id uuid := auth.uid();
  v_participant public.pilot_participants%rowtype;
  v_review public.pilot_reviews%rowtype;
  v_action text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_rating not between 1 and 5 then raise exception 'Rating must be between 1 and 5'; end if;
  if p_category not in ('usability','location','reporting','case_updates','navigation','performance','broken_feature','other') then
    raise exception 'Unsupported review category';
  end if;
  if coalesce(cardinality(p_quick_feedback), 0) > 10 then raise exception 'Too many quick feedback selections'; end if;
  if char_length(coalesce(p_review_text, '')) > 5000 then raise exception 'Review text is too long'; end if;
  if jsonb_typeof(coalesce(p_device_metadata, '{}'::jsonb)) <> 'object' then raise exception 'Device metadata must be an object'; end if;

  select pp.* into v_participant
  from public.pilot_participants pp
  join public.pilot_programs pg on pg.id = pp.program_id
  where pp.user_id = v_user_id
    and pp.status in ('consented','active','completed')
    and pg.status = 'active'
    and (pg.starts_at is null or pg.starts_at <= now())
    and (pg.ends_at is null or pg.ends_at >= now())
    and pp.campus = any(pg.eligible_campuses)
  order by pp.created_at desc
  limit 1;

  if not found then raise exception 'No active Pilot participation is available for review submission'; end if;

  if p_report_id is not null and not exists (
    select 1 from public.pilot_reports pr
    where pr.id = p_report_id
      and pr.program_id = v_participant.program_id
      and pr.participant_id = v_participant.id
      and pr.submitted_by = v_user_id
      and pr.campus = v_participant.campus
      and pr.deleted_at is null
  ) then
    raise exception 'Related case does not belong to this Pilot participant';
  end if;

  if p_attachment_path is not null and (
    p_attachment_path !~ '^[0-9a-f-]{36}/[a-z0-9_]+/[0-9a-f-]{36}/reviews/[^/]+$'
    or split_part(p_attachment_path, '/', 1) <> v_participant.program_id::text
    or split_part(p_attachment_path, '/', 2) <> v_participant.campus::text
    or split_part(p_attachment_path, '/', 3) <> v_user_id::text
  ) then
    raise exception 'Review attachment path is not authorised';
  end if;

  if p_review_id is null then
    if (
      select count(*)
      from public.pilot_reviews pr
      where pr.user_id = v_user_id
        and pr.created_at >= now() - interval '15 minutes'
    ) >= 5 then
      raise exception 'Review submission rate limit reached. Try again later.';
    end if;

    insert into public.pilot_reviews (
      program_id, participant_id, user_id, campus, report_id, rating, category,
      quick_feedback, review_text, attachment_path, device_metadata, contact_permission
    ) values (
      v_participant.program_id, v_participant.id, v_user_id, v_participant.campus,
      p_report_id, p_rating, p_category, coalesce(p_quick_feedback, '{}'::text[]),
      btrim(coalesce(p_review_text, '')), p_attachment_path,
      coalesce(p_device_metadata, '{}'::jsonb), coalesce(p_contact_permission, false)
    ) returning * into v_review;
    v_action := 'pilot_review_submitted';
  else
    select * into v_review
    from public.pilot_reviews
    where id = p_review_id and user_id = v_user_id
    for update;

    if not found then raise exception 'Review not found'; end if;
    if v_review.status not in ('submitted','under_review','responded') then
      raise exception 'This review can no longer be edited';
    end if;
    if v_review.program_id <> v_participant.program_id or v_review.participant_id <> v_participant.id or v_review.campus <> v_participant.campus then
      raise exception 'Review ownership mismatch';
    end if;

    update public.pilot_reviews
    set report_id = p_report_id,
        rating = p_rating,
        category = p_category,
        quick_feedback = coalesce(p_quick_feedback, '{}'::text[]),
        review_text = btrim(coalesce(p_review_text, '')),
        attachment_path = coalesce(p_attachment_path, attachment_path),
        device_metadata = coalesce(p_device_metadata, '{}'::jsonb),
        contact_permission = coalesce(p_contact_permission, false),
        status = 'submitted',
        admin_response = null,
        reviewed_by = null,
        reviewed_at = null
    where id = p_review_id
    returning * into v_review;
    v_action := 'pilot_review_updated';
  end if;

  insert into public.pilot_audit_logs (
    program_id, actor_id, actor_role, actor_campus, action, entity_type, entity_id, metadata
  ) values (
    v_review.program_id, v_user_id, private.pilot_actor_role(v_user_id), v_review.campus,
    v_action, 'pilot_review', v_review.id,
    jsonb_build_object('rating', v_review.rating, 'category', v_review.category, 'status', v_review.status)
  );

  return v_review;
end
$$;

create or replace function public.pilot_moderate_review(
  p_review_id uuid,
  p_status public.pilot_review_status,
  p_admin_response text default null
)
returns public.pilot_reviews
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_review public.pilot_reviews%rowtype;
  v_response text := nullif(btrim(coalesce(p_admin_response, '')), '');
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not private.pilot_can_manage_review(v_user_id, p_review_id) then raise exception 'Not authorised to manage this review'; end if;
  if p_status = 'submitted' then raise exception 'Staff cannot reset a review to submitted'; end if;
  if char_length(coalesce(v_response, '')) > 5000 then raise exception 'Admin response is too long'; end if;
  if p_status in ('responded','resolved') and v_response is null then raise exception 'A response is required for this status'; end if;

  update public.pilot_reviews
  set status = p_status,
      admin_response = case when v_response is not null then v_response else admin_response end,
      reviewed_by = v_user_id,
      reviewed_at = now()
  where id = p_review_id
  returning * into v_review;

  insert into public.pilot_audit_logs (
    program_id, actor_id, actor_role, actor_campus, action, entity_type, entity_id, reason, metadata
  ) values (
    v_review.program_id, v_user_id, private.pilot_actor_role(v_user_id), private.pilot_user_campus(v_user_id),
    'pilot_review_moderated', 'pilot_review', v_review.id, v_response,
    jsonb_build_object('status', v_review.status, 'student_user_id', v_review.user_id)
  );

  if v_response is not null then
    insert into public.pilot_notifications (
      program_id, report_id, user_id, notification_type, title, message, created_by
    ) values (
      v_review.program_id, v_review.report_id, v_review.user_id, 'programme_message',
      'Response to your Pilot review', v_response, v_user_id
    );
  end if;

  return v_review;
end
$$;

alter table public.pilot_reviews enable row level security;

drop policy if exists pilot_reviews_select on public.pilot_reviews;
create policy pilot_reviews_select
on public.pilot_reviews for select to authenticated
using (private.pilot_can_access_review((select auth.uid()), id));

revoke insert, update, delete on public.pilot_reviews from anon, authenticated;
grant select on public.pilot_reviews to authenticated;
grant execute on function public.pilot_submit_review(integer,text,text[],text,uuid,text,jsonb,boolean,uuid) to authenticated;
grant execute on function public.pilot_moderate_review(uuid,public.pilot_review_status,text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pilot-review-attachments',
  'pilot-review-attachments',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists pilot_review_objects_insert on storage.objects;
drop policy if exists pilot_review_objects_select on storage.objects;

create policy pilot_review_objects_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'pilot-review-attachments'
  and name ~ '^[0-9a-f-]{36}/[a-z0-9_]+/[0-9a-f-]{36}/reviews/[^/]+$'
  and split_part(name, '/', 3) = (select auth.uid())::text
  and exists (
    select 1
    from public.pilot_participants pp
    where pp.program_id::text = split_part(name, '/', 1)
      and pp.campus::text = split_part(name, '/', 2)
      and pp.user_id = (select auth.uid())
      and pp.status in ('consented','active','completed')
      and private.pilot_review_program_is_open(pp.program_id, pp.campus)
  )
);

create policy pilot_review_objects_select
on storage.objects for select to authenticated
using (
  bucket_id = 'pilot-review-attachments'
  and exists (
    select 1
    from public.pilot_reviews pr
    where pr.attachment_path = name
      and private.pilot_can_access_review((select auth.uid()), pr.id)
  )
);

do $$
begin
  alter publication supabase_realtime add table public.pilot_reviews;
exception when duplicate_object then null;
end $$;

comment on table public.pilot_reviews is 'Isolated Controlled Pilot review workflow. It is not a production feedback or public review table.';
comment on column public.pilot_reviews.campus is 'Server-derived from the authenticated Pilot participant and immutable through the review RPC.';
comment on column public.pilot_reviews.device_metadata is 'Client device and browser diagnostics captured for Pilot quality analysis.';
