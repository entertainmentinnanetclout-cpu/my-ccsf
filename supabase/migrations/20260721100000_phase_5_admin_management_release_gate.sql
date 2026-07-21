-- Phase 5: complete Pilot administration, configurable review options and managed content.

create table if not exists public.pilot_review_categories (
  key text primary key check (key ~ '^[a-z0-9_]{2,40}$'),
  label text not null check (char_length(label) between 2 and 80),
  description text not null default '' check (char_length(description) <= 400),
  display_order integer not null default 0 check (display_order >= 0),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pilot_review_quick_cards (
  id uuid primary key default gen_random_uuid(),
  label text not null unique check (char_length(label) between 2 and 120),
  category_key text not null references public.pilot_review_categories(key) on update cascade on delete restrict,
  sentiment text not null default 'neutral' check (sentiment in ('positive','negative','neutral')),
  display_order integer not null default 0 check (display_order >= 0),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pilot_guide_steps (
  id uuid primary key default gen_random_uuid(),
  step_key text not null unique check (step_key ~ '^[a-z0-9_]{2,50}$'),
  title text not null check (char_length(title) between 2 and 140),
  description text not null check (char_length(description) between 2 and 900),
  accent text not null check (char_length(accent) between 2 and 80),
  icon_key text not null default 'shield' check (icon_key in ('home','report','emergency','location','cases','notifications','reviews','limitations','shield')),
  display_order integer not null default 0 check (display_order between 0 and 99),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pilot_resource_documents
  add column if not exists storage_path text,
  add column if not exists file_name text,
  add column if not exists file_size_bytes bigint check (file_size_bytes is null or file_size_bytes > 0);

create index if not exists pilot_review_categories_order_idx
  on public.pilot_review_categories(is_active, display_order, key);
create index if not exists pilot_review_quick_cards_order_idx
  on public.pilot_review_quick_cards(is_active, display_order, label);
create index if not exists pilot_guide_steps_order_idx
  on public.pilot_guide_steps(is_active, display_order, step_key);

create or replace function private.pilot_touch_phase5_updated_at()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  new.updated_at := now();
  if private.pilot_is_super_admin(auth.uid()) then
    new.updated_by := auth.uid();
  end if;
  return new;
end
$$;

drop trigger if exists pilot_review_categories_touch_updated_at on public.pilot_review_categories;
create trigger pilot_review_categories_touch_updated_at
before update on public.pilot_review_categories
for each row execute function private.pilot_touch_phase5_updated_at();

drop trigger if exists pilot_review_quick_cards_touch_updated_at on public.pilot_review_quick_cards;
create trigger pilot_review_quick_cards_touch_updated_at
before update on public.pilot_review_quick_cards
for each row execute function private.pilot_touch_phase5_updated_at();

drop trigger if exists pilot_guide_steps_touch_updated_at on public.pilot_guide_steps;
create trigger pilot_guide_steps_touch_updated_at
before update on public.pilot_guide_steps
for each row execute function private.pilot_touch_phase5_updated_at();

create or replace function private.pilot_can_read_phase5_configuration(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select p_user_id is not null and (
    private.pilot_is_super_admin(p_user_id)
    or private.pilot_is_security(p_user_id)
    or exists (select 1 from private.pilot_current_participation(p_user_id))
  )
$$;

alter table public.pilot_review_categories enable row level security;
alter table public.pilot_review_quick_cards enable row level security;
alter table public.pilot_guide_steps enable row level security;

drop policy if exists pilot_review_categories_select on public.pilot_review_categories;
create policy pilot_review_categories_select
on public.pilot_review_categories for select to authenticated
using (private.pilot_can_read_phase5_configuration((select auth.uid())) and (is_active or private.pilot_is_super_admin((select auth.uid()))));

drop policy if exists pilot_review_categories_admin_insert on public.pilot_review_categories;
create policy pilot_review_categories_admin_insert
on public.pilot_review_categories for insert to authenticated
with check (private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_review_categories_admin_update on public.pilot_review_categories;
create policy pilot_review_categories_admin_update
on public.pilot_review_categories for update to authenticated
using (private.pilot_is_super_admin((select auth.uid())))
with check (private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_review_categories_admin_delete on public.pilot_review_categories;
create policy pilot_review_categories_admin_delete
on public.pilot_review_categories for delete to authenticated
using (private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_review_quick_cards_select on public.pilot_review_quick_cards;
create policy pilot_review_quick_cards_select
on public.pilot_review_quick_cards for select to authenticated
using (private.pilot_can_read_phase5_configuration((select auth.uid())) and (is_active or private.pilot_is_super_admin((select auth.uid()))));

drop policy if exists pilot_review_quick_cards_admin_insert on public.pilot_review_quick_cards;
create policy pilot_review_quick_cards_admin_insert
on public.pilot_review_quick_cards for insert to authenticated
with check (private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_review_quick_cards_admin_update on public.pilot_review_quick_cards;
create policy pilot_review_quick_cards_admin_update
on public.pilot_review_quick_cards for update to authenticated
using (private.pilot_is_super_admin((select auth.uid())))
with check (private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_review_quick_cards_admin_delete on public.pilot_review_quick_cards;
create policy pilot_review_quick_cards_admin_delete
on public.pilot_review_quick_cards for delete to authenticated
using (private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_guide_steps_select on public.pilot_guide_steps;
create policy pilot_guide_steps_select
on public.pilot_guide_steps for select to authenticated
using (private.pilot_can_read_phase5_configuration((select auth.uid())) and (is_active or private.pilot_is_super_admin((select auth.uid()))));

drop policy if exists pilot_guide_steps_admin_insert on public.pilot_guide_steps;
create policy pilot_guide_steps_admin_insert
on public.pilot_guide_steps for insert to authenticated
with check (private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_guide_steps_admin_update on public.pilot_guide_steps;
create policy pilot_guide_steps_admin_update
on public.pilot_guide_steps for update to authenticated
using (private.pilot_is_super_admin((select auth.uid())))
with check (private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_guide_steps_admin_delete on public.pilot_guide_steps;
create policy pilot_guide_steps_admin_delete
on public.pilot_guide_steps for delete to authenticated
using (private.pilot_is_super_admin((select auth.uid())));

-- Phase 4 content remains student-scoped for reads; Phase 5 adds explicit super-admin management.
drop policy if exists pilot_carousel_admin_select on public.pilot_carousel_slides;
create policy pilot_carousel_admin_select
on public.pilot_carousel_slides for select to authenticated
using (private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_carousel_admin_insert on public.pilot_carousel_slides;
create policy pilot_carousel_admin_insert
on public.pilot_carousel_slides for insert to authenticated
with check (private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_carousel_admin_update on public.pilot_carousel_slides;
create policy pilot_carousel_admin_update
on public.pilot_carousel_slides for update to authenticated
using (private.pilot_is_super_admin((select auth.uid())))
with check (private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_carousel_admin_delete on public.pilot_carousel_slides;
create policy pilot_carousel_admin_delete
on public.pilot_carousel_slides for delete to authenticated
using (private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_resources_admin_select on public.pilot_resource_documents;
create policy pilot_resources_admin_select
on public.pilot_resource_documents for select to authenticated
using (private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_resources_admin_insert on public.pilot_resource_documents;
create policy pilot_resources_admin_insert
on public.pilot_resource_documents for insert to authenticated
with check (private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_resources_admin_update on public.pilot_resource_documents;
create policy pilot_resources_admin_update
on public.pilot_resource_documents for update to authenticated
using (private.pilot_is_super_admin((select auth.uid())))
with check (private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_resources_admin_delete on public.pilot_resource_documents;
create policy pilot_resources_admin_delete
on public.pilot_resource_documents for delete to authenticated
using (private.pilot_is_super_admin((select auth.uid())));

grant select, insert, update, delete on public.pilot_review_categories to authenticated;
grant select, insert, update, delete on public.pilot_review_quick_cards to authenticated;
grant select, insert, update, delete on public.pilot_guide_steps to authenticated;
grant insert, update, delete on public.pilot_carousel_slides to authenticated;
grant insert, update, delete on public.pilot_resource_documents to authenticated;

insert into public.pilot_review_categories(key, label, description, display_order, is_active)
values
  ('usability', 'Ease of use', 'General usability and clarity of the Pilot experience.', 10, true),
  ('location', 'Location', 'Accuracy, permissions and readable location information.', 20, true),
  ('reporting', 'Reporting', 'Standard and Emergency Test reporting workflows.', 30, true),
  ('case_updates', 'Case updates', 'Timeline, staff response and status visibility.', 40, true),
  ('navigation', 'Navigation', 'Finding pages, actions and information.', 50, true),
  ('performance', 'Performance', 'Loading speed, responsiveness and reliability.', 60, true),
  ('broken_feature', 'Broken feature', 'A feature that failed or behaved incorrectly.', 70, true),
  ('other', 'Other', 'Feedback that does not fit another category.', 80, true)
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  display_order = excluded.display_order;

insert into public.pilot_review_quick_cards(id, label, category_key, sentiment, display_order, is_active)
values
  ('50000000-0000-4000-8000-000000000001', 'Easy to use', 'usability', 'positive', 10, true),
  ('50000000-0000-4000-8000-000000000002', 'Location worked correctly', 'location', 'positive', 20, true),
  ('50000000-0000-4000-8000-000000000003', 'Reporting was clear', 'reporting', 'positive', 30, true),
  ('50000000-0000-4000-8000-000000000004', 'Case updates were useful', 'case_updates', 'positive', 40, true),
  ('50000000-0000-4000-8000-000000000005', 'I felt more informed', 'case_updates', 'positive', 50, true),
  ('50000000-0000-4000-8000-000000000006', 'Navigation was confusing', 'navigation', 'negative', 60, true),
  ('50000000-0000-4000-8000-000000000007', 'Location was inaccurate', 'location', 'negative', 70, true),
  ('50000000-0000-4000-8000-000000000008', 'App was slow', 'performance', 'negative', 80, true),
  ('50000000-0000-4000-8000-000000000009', 'I found a broken feature', 'broken_feature', 'negative', 90, true),
  ('50000000-0000-4000-8000-000000000010', 'Other feedback', 'other', 'neutral', 100, true)
on conflict (id) do update set
  label = excluded.label,
  category_key = excluded.category_key,
  sentiment = excluded.sentiment,
  display_order = excluded.display_order;

insert into public.pilot_guide_steps(id, step_key, title, description, accent, icon_key, display_order, is_active)
values
  ('50000000-0000-4000-8000-000000000101', 'dashboard_navigation', 'Navigate the Pilot dashboard', 'Use Home for the carousel and quick actions, My Cases for progress, Report for test submissions, Reviews for feedback, Safety Guide for learning material and Support for staff notifications.', 'Dashboard', 'home', 0, true),
  ('50000000-0000-4000-8000-000000000102', 'standard_reporting', 'Submit a standard report', 'Select an authorised scenario, describe the test incident, confirm the readable location and attach only relevant test evidence when requested.', 'Standard reporting', 'report', 1, true),
  ('50000000-0000-4000-8000-000000000103', 'emergency_reporting', 'Use Emergency Test correctly', 'Emergency Test is deliberately short. Share your current location, read the consent statement and submit. Your registered student profile is attached automatically.', 'Emergency reporting', 'emergency', 2, true),
  ('50000000-0000-4000-8000-000000000104', 'location_permissions', 'Understand location permissions', 'The app requests a high-accuracy position first, shows a readable address and stores coordinates and accuracy as supporting technical evidence inside the isolated Pilot.', 'Location', 'location', 3, true),
  ('50000000-0000-4000-8000-000000000105', 'case_tracking', 'Track a case from start to finish', 'Open any case card to see the reference number, current status, assigned staff member, timeline notes, evidence and authorised campus-security updates.', 'Case tracking', 'cases', 4, true),
  ('50000000-0000-4000-8000-000000000106', 'staff_notifications', 'Read staff notifications', 'Authorised Pilot staff can send case-linked updates. Unread messages appear in Support and remain tied to your authenticated student account.', 'Notifications', 'notifications', 5, true),
  ('50000000-0000-4000-8000-000000000107', 'pilot_reviews', 'Submit a Pilot review', 'Choose quick feedback, add a 1-5 star rating and explain what worked or failed. You can edit unresolved reviews and read authorised responses.', 'Reviews', 'reviews', 6, true),
  ('50000000-0000-4000-8000-000000000108', 'pilot_limitations', 'Know the Pilot limitations', 'The Pilot tests digital workflows only. It does not replace Campus Protection Services authority, SAPS, ambulance services or established emergency procedures.', 'Important limitation', 'limitations', 7, true)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  accent = excluded.accent,
  icon_key = excluded.icon_key,
  display_order = excluded.display_order;

-- Categories become data-driven while historical reviews remain valid.
alter table public.pilot_reviews drop constraint if exists pilot_reviews_category_check;
do $$
begin
  alter table public.pilot_reviews
    add constraint pilot_reviews_category_fk
    foreign key (category) references public.pilot_review_categories(key)
    on update cascade on delete restrict;
exception when duplicate_object then null;
end $$;

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
  if not exists (select 1 from public.pilot_review_categories where key = p_category and is_active) then
    raise exception 'Unsupported or inactive review category';
  end if;
  if coalesce(cardinality(p_quick_feedback), 0) > 10 then raise exception 'Too many quick feedback selections'; end if;
  if exists (
    select 1 from unnest(coalesce(p_quick_feedback, '{}'::text[])) selected(label)
    where not exists (
      select 1 from public.pilot_review_quick_cards card
      where card.label = selected.label and card.is_active
    )
  ) then raise exception 'Unsupported or inactive quick feedback selection'; end if;
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
  ) then raise exception 'Related case does not belong to this Pilot participant'; end if;

  if p_attachment_path is not null and (
    p_attachment_path !~ '^[0-9a-f-]{36}/[a-z0-9_]+/[0-9a-f-]{36}/reviews/[^/]+$'
    or split_part(p_attachment_path, '/', 1) <> v_participant.program_id::text
    or split_part(p_attachment_path, '/', 2) <> v_participant.campus::text
    or split_part(p_attachment_path, '/', 3) <> v_user_id::text
  ) then raise exception 'Review attachment path is not authorised'; end if;

  if p_review_id is null then
    if (
      select count(*) from public.pilot_reviews pr
      where pr.user_id = v_user_id and pr.created_at >= now() - interval '15 minutes'
    ) >= 5 then raise exception 'Review submission rate limit reached. Try again later.'; end if;

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
    select * into v_review from public.pilot_reviews
    where id = p_review_id and user_id = v_user_id for update;
    if not found then raise exception 'Review not found'; end if;
    if v_review.status not in ('submitted','under_review','responded') then raise exception 'This review can no longer be edited'; end if;
    if v_review.program_id <> v_participant.program_id or v_review.participant_id <> v_participant.id or v_review.campus <> v_participant.campus then raise exception 'Review ownership mismatch'; end if;

    update public.pilot_reviews
    set report_id = p_report_id,
        rating = p_rating,
        category = p_category,
        quick_feedback = coalesce(p_quick_feedback, '{}'::text[]),
        review_text = btrim(coalesce(p_review_text, '')),
        attachment_path = coalesce(p_attachment_path, attachment_path),
        device_metadata = coalesce(p_device_metadata, '{}'::jsonb),
        contact_permission = coalesce(p_contact_permission, false),
        status = 'submitted', admin_response = null, reviewed_by = null, reviewed_at = null
    where id = p_review_id returning * into v_review;
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('pilot-content-assets', 'pilot-content-assets', true, 5242880, array['image/jpeg','image/png','image/webp']::text[]),
  ('pilot-resource-documents', 'pilot-resource-documents', false, 15728640, array['application/pdf']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists pilot_content_assets_admin_insert on storage.objects;
create policy pilot_content_assets_admin_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'pilot-content-assets' and private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_content_assets_admin_update on storage.objects;
create policy pilot_content_assets_admin_update
on storage.objects for update to authenticated
using (bucket_id = 'pilot-content-assets' and private.pilot_is_super_admin((select auth.uid())))
with check (bucket_id = 'pilot-content-assets' and private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_content_assets_admin_delete on storage.objects;
create policy pilot_content_assets_admin_delete
on storage.objects for delete to authenticated
using (bucket_id = 'pilot-content-assets' and private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_resource_documents_admin_all on storage.objects;
create policy pilot_resource_documents_admin_all
on storage.objects for all to authenticated
using (bucket_id = 'pilot-resource-documents' and private.pilot_is_super_admin((select auth.uid())))
with check (bucket_id = 'pilot-resource-documents' and private.pilot_is_super_admin((select auth.uid())));

drop policy if exists pilot_resource_documents_participant_select on storage.objects;
create policy pilot_resource_documents_participant_select
on storage.objects for select to authenticated
using (
  bucket_id = 'pilot-resource-documents'
  and exists (
    select 1 from public.pilot_resource_documents document
    join private.pilot_current_participation((select auth.uid())) participation on true
    where document.storage_path = name
      and document.is_active
      and (document.program_id is null or document.program_id = participation.program_id)
      and participation.campus = any(document.campus_targets)
      and (document.starts_at is null or document.starts_at <= now())
      and (document.expires_at is null or document.expires_at >= now())
  )
);

do $$
begin
  alter publication supabase_realtime add table public.pilot_review_categories;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.pilot_review_quick_cards;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.pilot_guide_steps;
exception when duplicate_object then null;
end $$;

comment on table public.pilot_review_categories is 'Super-admin managed review categories used only by the Controlled Pilot.';
comment on table public.pilot_review_quick_cards is 'Super-admin managed quick-review cards used only by the Controlled Pilot.';
comment on table public.pilot_guide_steps is 'Super-admin managed cross-device Pilot guide content.';
