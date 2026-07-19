do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='pilot_program_status') then
    create type public.pilot_program_status as enum ('draft','active','paused','completed','archived');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='pilot_participant_status') then
    create type public.pilot_participant_status as enum ('invited','consented','active','completed','declined','withdrawn','removed');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='pilot_session_status') then
    create type public.pilot_session_status as enum ('in_progress','completed','abandoned','withdrawn','expired');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='pilot_report_status') then
    create type public.pilot_report_status as enum ('received','assessing','assigned','in_progress','simulation_completed','cancelled','withdrawn','expired');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='pilot_scenario_type') then
    create type public.pilot_scenario_type as enum ('standard_report','emergency_simulation','location_test','live_tracking_test','attachment_test','notification_test','resource_download','end_to_end');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='pilot_event_type') then
    create type public.pilot_event_type as enum ('report_created','status_changed','assigned','note_added','location_started','location_stopped','attachment_added','notification_created','simulation_completed','report_deleted');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='pilot_notification_type') then
    create type public.pilot_notification_type as enum ('report_received','status_changed','assigned','simulation_completed','action_required','session_expiring','programme_message');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='pilot_test_outcome') then
    create type public.pilot_test_outcome as enum ('passed','failed','skipped','denied','abandoned');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='pilot_location_source') then
    create type public.pilot_location_source as enum ('initial_fix','live_tracking','manual_pin','resumed_tracking');
  end if;
end $$;

create table if not exists public.pilot_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 3 and 150),
  description text,
  status public.pilot_program_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  eligible_campuses public.campus_location[] not null,
  retention_days integer not null default 30 check (retention_days between 7 and 90),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint pilot_program_dates_valid check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint pilot_program_campuses_not_empty check (cardinality(eligible_campuses) > 0)
);

create table if not exists public.pilot_scenarios (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.pilot_programs(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 150),
  instructions text not null check (char_length(btrim(instructions)) between 5 and 5000),
  scenario_type public.pilot_scenario_type not null,
  expected_category public.incident_category,
  requires_location boolean not null default false,
  requires_live_tracking boolean not null default false,
  requires_attachment boolean not null default false,
  requires_notification boolean not null default false,
  requires_resource_download boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pilot_participants (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.pilot_programs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  campus public.campus_location not null,
  status public.pilot_participant_status not null default 'invited',
  invited_by uuid not null references public.profiles(id) on delete restrict,
  invited_at timestamptz not null default now(),
  consented_at timestamptz,
  consent_version text,
  withdrawn_at timestamptz,
  withdrawal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_participants_program_user_unique unique (program_id, user_id),
  constraint pilot_participant_consent_pair check ((consented_at is null and consent_version is null) or (consented_at is not null and consent_version is not null)),
  constraint pilot_participant_withdrawal_pair check ((withdrawn_at is null and withdrawal_reason is null) or withdrawn_at is not null)
);

create table if not exists public.pilot_sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.pilot_programs(id) on delete cascade,
  participant_id uuid not null references public.pilot_participants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  campus public.campus_location not null,
  status public.pilot_session_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null,
  device_type text,
  browser_name text,
  browser_version text,
  operating_system text,
  viewport_width integer check (viewport_width is null or viewport_width > 0),
  viewport_height integer check (viewport_height is null or viewport_height > 0),
  network_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_session_expiry_valid check (expires_at > started_at),
  constraint pilot_session_completion_valid check (completed_at is null or completed_at >= started_at)
);

create table if not exists public.pilot_reports (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.pilot_programs(id) on delete cascade,
  session_id uuid not null references public.pilot_sessions(id) on delete cascade,
  scenario_id uuid references public.pilot_scenarios(id) on delete set null,
  participant_id uuid not null references public.pilot_participants(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  campus public.campus_location not null,
  reference_number text not null unique,
  title text not null check (char_length(btrim(title)) between 3 and 200),
  description text not null check (char_length(btrim(description)) between 5 and 10000),
  category public.incident_category not null,
  status public.pilot_report_status not null default 'received',
  is_anonymous boolean not null default false,
  location_lat numeric check (location_lat is null or location_lat between -90 and 90),
  location_lng numeric check (location_lng is null or location_lng between -180 and 180),
  location_accuracy numeric check (location_accuracy is null or location_accuracy >= 0),
  location_description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz not null default now(),
  simulation_completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_report_completion_valid check (simulation_completed_at is null or simulation_completed_at >= submitted_at)
);

create table if not exists public.pilot_report_events (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.pilot_programs(id) on delete cascade,
  report_id uuid not null references public.pilot_reports(id) on delete cascade,
  session_id uuid not null references public.pilot_sessions(id) on delete cascade,
  event_type public.pilot_event_type not null,
  from_status public.pilot_report_status,
  to_status public.pilot_report_status,
  actor_id uuid not null,
  actor_role public.user_role not null,
  notes text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now()
);

create table if not exists public.pilot_location_events (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.pilot_programs(id) on delete cascade,
  session_id uuid not null references public.pilot_sessions(id) on delete cascade,
  report_id uuid not null references public.pilot_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  latitude numeric not null check (latitude between -90 and 90),
  longitude numeric not null check (longitude between -180 and 180),
  accuracy numeric check (accuracy is null or accuracy >= 0),
  altitude numeric,
  heading numeric check (heading is null or heading between 0 and 360),
  speed numeric check (speed is null or speed >= 0),
  source public.pilot_location_source not null,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.pilot_attachments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.pilot_programs(id) on delete cascade,
  session_id uuid not null references public.pilot_sessions(id) on delete cascade,
  report_id uuid not null references public.pilot_reports(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  original_filename text,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  checksum text,
  created_at timestamptz not null default now(),
  constraint pilot_attachment_mime_allowed check (mime_type in ('image/jpeg','image/png','image/webp','video/mp4','application/pdf'))
);

create table if not exists public.pilot_notifications (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.pilot_programs(id) on delete cascade,
  session_id uuid references public.pilot_sessions(id) on delete cascade,
  report_id uuid references public.pilot_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type public.pilot_notification_type not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  is_read boolean not null default false,
  read_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  constraint pilot_notification_read_pair check ((is_read=false and read_at is null) or is_read=true)
);

create table if not exists public.pilot_feature_tests (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.pilot_programs(id) on delete cascade,
  session_id uuid not null references public.pilot_sessions(id) on delete cascade,
  report_id uuid references public.pilot_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature_key text not null check (char_length(btrim(feature_key)) between 1 and 100),
  outcome public.pilot_test_outcome not null,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  error_code text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now()
);

create table if not exists public.pilot_feedback (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.pilot_programs(id) on delete cascade,
  session_id uuid not null references public.pilot_sessions(id) on delete cascade,
  report_id uuid references public.pilot_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  ease_of_use_rating integer check (ease_of_use_rating is null or ease_of_use_rating between 1 and 5),
  confidence_rating integer check (confidence_rating is null or confidence_rating between 1 and 5),
  clarity_rating integer check (clarity_rating is null or clarity_rating between 1 and 5),
  would_use_in_emergency boolean,
  comments text check (comments is null or char_length(comments) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_feedback_session_user_unique unique (session_id, user_id)
);

create table if not exists public.pilot_audit_logs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.pilot_programs(id) on delete set null,
  actor_id uuid not null,
  actor_role public.user_role not null,
  actor_campus public.campus_location,
  action text not null check (char_length(btrim(action)) between 1 and 150),
  entity_type text not null check (char_length(btrim(entity_type)) between 1 and 100),
  entity_id uuid,
  affected_count integer not null default 1 check (affected_count >= 0),
  reason text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now()
);
