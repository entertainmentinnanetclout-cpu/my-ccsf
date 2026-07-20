create table if not exists public.pilot_carousel_slides (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.pilot_programs(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  description text not null check (char_length(description) between 1 and 800),
  eyebrow text not null default 'My CCSF Pilot' check (char_length(eyebrow) <= 80),
  icon_key text not null default 'shield' check (icon_key in ('shield','report','emergency','location','cases','reviews','guide','limitations')),
  image_url text,
  image_alt text,
  image_fit text not null default 'contain' check (image_fit in ('contain','cover')),
  button_label text,
  action_key text not null default 'none' check (action_key in ('none','report','emergency','cases','reviews','resources','support')),
  campus_targets public.campus_location[] not null default array[
    'pretoria_west_main'::public.campus_location,
    'soshanguve_north'::public.campus_location,
    'soshanguve_south'::public.campus_location,
    'garankuwa'::public.campus_location,
    'arcadia'::public.campus_location,
    'arts'::public.campus_location,
    'mbombela'::public.campus_location,
    'emalahleni'::public.campus_location,
    'polokwane'::public.campus_location,
    'giyani'::public.campus_location
  ],
  display_order integer not null default 0 check (display_order >= 0),
  is_active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_carousel_schedule_valid check (expires_at is null or starts_at is null or expires_at > starts_at),
  constraint pilot_carousel_targets_present check (cardinality(campus_targets) > 0),
  constraint pilot_carousel_button_pair check (
    (action_key = 'none' and button_label is null)
    or (action_key <> 'none' and button_label is not null and char_length(button_label) between 1 and 60)
  )
);

create index if not exists pilot_carousel_active_order_idx
  on public.pilot_carousel_slides(is_active, display_order, created_at);
create index if not exists pilot_carousel_program_idx
  on public.pilot_carousel_slides(program_id, is_active, display_order);

create table if not exists public.pilot_user_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid not null references public.pilot_programs(id) on delete cascade,
  guide_version text not null default '2026.07',
  guide_last_step integer not null default 0 check (guide_last_step between 0 and 7),
  guide_auto_show boolean not null default true,
  guide_completed_at timestamptz,
  guide_dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, program_id)
);

create table if not exists public.pilot_resource_documents (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.pilot_programs(id) on delete cascade,
  title text not null,
  description text not null,
  document_type text not null default 'safety_guide' check (document_type in ('safety_guide','quick_reference','other')),
  version text not null,
  publication_date date not null,
  download_url text not null check (download_url like '/downloads/%' or download_url like 'https://%'),
  campus_targets public.campus_location[] not null default array[
    'pretoria_west_main'::public.campus_location,
    'soshanguve_north'::public.campus_location,
    'soshanguve_south'::public.campus_location,
    'garankuwa'::public.campus_location,
    'arcadia'::public.campus_location,
    'arts'::public.campus_location,
    'mbombela'::public.campus_location,
    'emalahleni'::public.campus_location,
    'polokwane'::public.campus_location,
    'giyani'::public.campus_location
  ],
  is_active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_resource_schedule_valid check (expires_at is null or starts_at is null or expires_at > starts_at),
  constraint pilot_resource_targets_present check (cardinality(campus_targets) > 0)
);

create index if not exists pilot_resource_active_idx
  on public.pilot_resource_documents(document_type, is_active, publication_date desc);

create or replace function private.pilot_touch_phase4_updated_at()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists pilot_carousel_touch_updated_at on public.pilot_carousel_slides;
create trigger pilot_carousel_touch_updated_at
before update on public.pilot_carousel_slides
for each row execute function private.pilot_touch_phase4_updated_at();

drop trigger if exists pilot_preferences_touch_updated_at on public.pilot_user_preferences;
create trigger pilot_preferences_touch_updated_at
before update on public.pilot_user_preferences
for each row execute function private.pilot_touch_phase4_updated_at();

drop trigger if exists pilot_resources_touch_updated_at on public.pilot_resource_documents;
create trigger pilot_resources_touch_updated_at
before update on public.pilot_resource_documents
for each row execute function private.pilot_touch_phase4_updated_at();

create or replace function private.pilot_current_participation(p_user_id uuid)
returns table(program_id uuid, participant_id uuid, campus public.campus_location)
language sql
stable
security definer
set search_path = public, private
as $$
  select pp.program_id, pp.id, pp.campus
  from public.pilot_participants pp
  join public.pilot_programs pg on pg.id = pp.program_id
  where pp.user_id = p_user_id
    and pp.status in ('consented','active','completed')
    and pg.status = 'active'
    and (pg.starts_at is null or pg.starts_at <= now())
    and (pg.ends_at is null or pg.ends_at >= now())
    and pp.campus = any(pg.eligible_campuses)
  order by pp.created_at desc
  limit 1
$$;

create or replace function private.pilot_can_read_phase4_content(
  p_user_id uuid,
  p_program_id uuid,
  p_campus_targets public.campus_location[]
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from private.pilot_current_participation(p_user_id) current_participation
    where (p_program_id is null or p_program_id = current_participation.program_id)
      and current_participation.campus = any(p_campus_targets)
  )
$$;

create or replace function public.pilot_get_guide_preferences()
returns public.pilot_user_preferences
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_participation record;
  v_preferences public.pilot_user_preferences%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select * into v_participation
  from private.pilot_current_participation(v_user_id);

  if not found then raise exception 'No active Pilot participation is available'; end if;

  insert into public.pilot_user_preferences(user_id, program_id)
  values (v_user_id, v_participation.program_id)
  on conflict (user_id, program_id) do nothing;

  select * into v_preferences
  from public.pilot_user_preferences
  where user_id = v_user_id and program_id = v_participation.program_id;

  return v_preferences;
end
$$;

create or replace function public.pilot_update_guide_preferences(
  p_last_step integer default null,
  p_auto_show boolean default null,
  p_completed boolean default false,
  p_dismissed boolean default false,
  p_reset boolean default false
)
returns public.pilot_user_preferences
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_participation record;
  v_preferences public.pilot_user_preferences%rowtype;
  v_action text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_last_step is not null and (p_last_step < 0 or p_last_step > 7) then
    raise exception 'Guide step is outside the supported range';
  end if;

  select * into v_participation
  from private.pilot_current_participation(v_user_id);
  if not found then raise exception 'No active Pilot participation is available'; end if;

  insert into public.pilot_user_preferences(user_id, program_id)
  values (v_user_id, v_participation.program_id)
  on conflict (user_id, program_id) do nothing;

  if p_reset then
    update public.pilot_user_preferences
    set guide_version = '2026.07',
        guide_last_step = 0,
        guide_auto_show = true,
        guide_completed_at = null,
        guide_dismissed_at = null
    where user_id = v_user_id and program_id = v_participation.program_id
    returning * into v_preferences;
    v_action := 'pilot_guide_reset';
  else
    update public.pilot_user_preferences
    set guide_last_step = coalesce(p_last_step, guide_last_step),
        guide_auto_show = coalesce(p_auto_show, guide_auto_show),
        guide_completed_at = case when p_completed then now() else guide_completed_at end,
        guide_dismissed_at = case when p_dismissed then now() else guide_dismissed_at end
    where user_id = v_user_id and program_id = v_participation.program_id
    returning * into v_preferences;
    v_action := case
      when p_completed then 'pilot_guide_completed'
      when p_dismissed then 'pilot_guide_dismissed'
      else 'pilot_guide_progress_saved'
    end;
  end if;

  insert into public.pilot_audit_logs(
    program_id, actor_id, actor_role, actor_campus, action, entity_type, entity_id, metadata
  ) values (
    v_participation.program_id,
    v_user_id,
    private.pilot_actor_role(v_user_id),
    v_participation.campus,
    v_action,
    'pilot_user_preferences',
    v_user_id,
    jsonb_build_object(
      'guide_version', v_preferences.guide_version,
      'guide_last_step', v_preferences.guide_last_step,
      'guide_auto_show', v_preferences.guide_auto_show
    )
  );

  return v_preferences;
end
$$;

alter table public.pilot_carousel_slides enable row level security;
alter table public.pilot_user_preferences enable row level security;
alter table public.pilot_resource_documents enable row level security;

drop policy if exists pilot_carousel_student_select on public.pilot_carousel_slides;
create policy pilot_carousel_student_select
on public.pilot_carousel_slides for select to authenticated
using (
  is_active
  and (starts_at is null or starts_at <= now())
  and (expires_at is null or expires_at >= now())
  and private.pilot_can_read_phase4_content((select auth.uid()), program_id, campus_targets)
);

drop policy if exists pilot_preferences_owner_select on public.pilot_user_preferences;
create policy pilot_preferences_owner_select
on public.pilot_user_preferences for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists pilot_resources_student_select on public.pilot_resource_documents;
create policy pilot_resources_student_select
on public.pilot_resource_documents for select to authenticated
using (
  is_active
  and (starts_at is null or starts_at <= now())
  and (expires_at is null or expires_at >= now())
  and private.pilot_can_read_phase4_content((select auth.uid()), program_id, campus_targets)
);

revoke insert, update, delete on public.pilot_carousel_slides from anon, authenticated;
revoke insert, update, delete on public.pilot_user_preferences from anon, authenticated;
revoke insert, update, delete on public.pilot_resource_documents from anon, authenticated;
grant select on public.pilot_carousel_slides to authenticated;
grant select on public.pilot_user_preferences to authenticated;
grant select on public.pilot_resource_documents to authenticated;
grant execute on function public.pilot_get_guide_preferences() to authenticated;
grant execute on function public.pilot_update_guide_preferences(integer,boolean,boolean,boolean,boolean) to authenticated;

insert into public.pilot_carousel_slides(
  id, title, description, eyebrow, icon_key, button_label, action_key, display_order, image_fit
) values
  ('40000000-0000-4000-8000-000000000001', 'Welcome to the My CCSF Pilot', 'Use this controlled environment to learn the safety workflow, test reporting and understand how campus-security teams receive Pilot cases.', 'Start here', 'shield', null, 'none', 10, 'contain'),
  ('40000000-0000-4000-8000-000000000002', 'Submit a clear standard report', 'Choose an approved workflow, describe what happened, confirm the readable location and add relevant test evidence when required.', 'Reporting', 'report', 'Open reporting', 'report', 20, 'contain'),
  ('40000000-0000-4000-8000-000000000003', 'Emergency reporting stays deliberately simple', 'The Emergency Test requires your current location and consent. Your registered profile is attached automatically; no long explanation is required.', 'Emergency Test', 'emergency', 'Open Emergency Test', 'emergency', 30, 'contain'),
  ('40000000-0000-4000-8000-000000000004', 'Understand how location is shared', 'A readable street or campus-area description is shown first. Coordinates and accuracy are retained as supporting technical evidence.', 'Location', 'location', 'View location guidance', 'resources', 40, 'contain'),
  ('40000000-0000-4000-8000-000000000005', 'Track every Pilot case', 'Open My Cases to see the reference number, current status, assigned staff member, timeline notes and authorised updates.', 'Case tracking', 'cases', 'Track my cases', 'cases', 50, 'contain'),
  ('40000000-0000-4000-8000-000000000006', 'Tell us what worked', 'Use quick review cards, a 1-5 star rating and written feedback. You can read authorised responses and edit unresolved reviews.', 'Pilot Reviews', 'reviews', 'Submit a review', 'reviews', 60, 'contain'),
  ('40000000-0000-4000-8000-000000000007', 'Know the Pilot limitations', 'Pilot records are isolated simulations. My CCSF Pilot does not replace CPS authority, SAPS, medical services or established emergency procedures.', 'Important limitation', 'limitations', 'Read the limitations', 'resources', 70, 'contain'),
  ('40000000-0000-4000-8000-000000000008', 'Keep the CCSF Safety Guide', 'Download the A4 handbook for reporting instructions, privacy guidance, emergency contacts, safety checklists and the Pilot QR code.', 'Safety Guide', 'guide', 'Download the guide', 'resources', 80, 'contain')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  eyebrow = excluded.eyebrow,
  icon_key = excluded.icon_key,
  button_label = excluded.button_label,
  action_key = excluded.action_key,
  display_order = excluded.display_order,
  image_fit = excluded.image_fit,
  is_active = true;

insert into public.pilot_resource_documents(
  id, title, description, document_type, version, publication_date, download_url
) values (
  '40000000-0000-4000-8000-000000000101',
  'CCSF Pilot Safety Guide',
  'Print-ready A4 handbook covering reporting, location permissions, case tracking, privacy, safety actions and verified support channels.',
  'safety_guide',
  '1.0',
  date '2026-07-20',
  '/downloads/CCSF-Pilot-Safety-Guide-v1.0.pdf'
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  version = excluded.version,
  publication_date = excluded.publication_date,
  download_url = excluded.download_url,
  is_active = true;

do $$
begin
  alter publication supabase_realtime add table public.pilot_carousel_slides;
exception when duplicate_object then null;
end $$;

comment on table public.pilot_carousel_slides is 'Isolated, ordered student dashboard content for the controlled Pilot. Phase 5 adds administrator management controls.';
comment on table public.pilot_user_preferences is 'Profile-bound cross-device Pilot guide state.';
comment on table public.pilot_resource_documents is 'Versioned downloadable Pilot resources. Phase 5 adds administrator file and version management.';
