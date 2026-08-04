-- My CCSF Join the Community
-- Shared official/Pilot data model with explicit environment isolation.

create extension if not exists pgcrypto;

create or replace function public.community_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create table if not exists public.community_profiles (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  user_id uuid not null references auth.users(id) on delete cascade,
  campus text,
  verification_status text not null default 'not_submitted' check (verification_status in ('not_submitted','pending','verified','failed','expired','requires_resubmission')),
  points integer not null default 0 check (points >= 0),
  leaderboard_visibility text not null default 'first_name' check (leaderboard_visibility in ('full_name','first_name','nickname','hidden')),
  leaderboard_nickname text,
  consent_at timestamptz,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (environment, user_id)
);

create table if not exists public.community_roles (
  id text primary key,
  title text not null,
  category text not null,
  summary text not null,
  responsibilities jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  disclaimer text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_role_applications (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  user_id uuid not null references auth.users(id) on delete cascade,
  campus text,
  selected_role text not null,
  secondary_role text,
  faculty text,
  course text not null,
  year_of_study text not null,
  residence text,
  relevant_skills text,
  experience text,
  motivation text,
  weekly_availability text,
  preferred_days text,
  preferred_times text,
  has_smartphone boolean not null default false,
  has_laptop boolean not null default false,
  has_drivers_licence boolean not null default false,
  portfolio_link text,
  consent_accepted boolean not null default false,
  code_of_conduct_accepted boolean not null default false,
  status text not null default 'draft' check (status in ('draft','submitted','under_review','shortlisted','interview_required','approved','waitlisted','rejected','active','suspended','completed','withdrawn')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_role_assignments (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id text not null,
  campus text,
  status text not null default 'active' check (status in ('active','suspended','completed','revoked')),
  permissions jsonb not null default '{}'::jsonb,
  assigned_by uuid not null references auth.users(id),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (environment, user_id, role_id)
);

create table if not exists public.community_games (
  id text primary key,
  environment text not null default 'official' check (environment in ('official','pilot')),
  title text not null,
  game_type text not null,
  description text not null,
  campus text,
  start_at timestamptz,
  close_at timestamptz,
  difficulty text,
  estimated_minutes integer,
  participant_mode text,
  points integer not null default 0 check (points >= 0),
  badge text,
  prize text,
  safety_notice text,
  rules jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_game_participants (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  status text not null default 'active' check (status in ('active','completed','withdrawn','disqualified')),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  points_awarded integer not null default 0 check (points_awarded >= 0),
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (environment, user_id, game_id)
);

create table if not exists public.community_game_submissions (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  participant_id uuid not null references public.community_game_participants(id) on delete cascade,
  checkpoint_key text not null,
  evidence_path text,
  location_lat double precision,
  location_lng double precision,
  location_accuracy double precision,
  submitted_code text,
  status text not null default 'submitted' check (status in ('submitted','verified','rejected','requires_resubmission')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.community_points (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  user_id uuid not null references auth.users(id) on delete cascade,
  points integer not null,
  reason text not null,
  source_type text not null,
  source_id text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  awarded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.community_badges (
  id text primary key,
  title text not null,
  description text,
  icon_key text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.community_user_badges (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.community_badges(id),
  source_type text,
  source_id text,
  awarded_by uuid references auth.users(id),
  awarded_at timestamptz not null default now(),
  unique (environment, user_id, badge_id)
);

create table if not exists public.tournaments (
  id text primary key,
  environment text not null default 'official' check (environment in ('official','pilot')),
  name text not null,
  sport text not null,
  campus text,
  venue text,
  starts_at timestamptz,
  registration_deadline timestamptz,
  team_limit integer not null check (team_limit > 0),
  required_player_count integer not null check (required_player_count > 0),
  coach_required boolean not null default false,
  rules jsonb not null default '[]'::jsonb,
  prize text,
  status text not null default 'open' check (status in ('draft','open','closed','fixtures_published','completed','cancelled')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sports_teams (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  tournament_id text not null,
  captain_user_id uuid not null references auth.users(id) on delete cascade,
  campus text,
  name text not null,
  affiliation_type text,
  affiliation_name text,
  logo_path text,
  coach_name text,
  coach_email text,
  status text not null default 'incomplete' check (status in ('incomplete','awaiting_players','ready_for_submission','under_review','approved','waitlisted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (environment, tournament_id, name)
);

create table if not exists public.sports_team_members (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  team_id uuid not null references public.sports_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'player' check (member_role in ('captain','player','coach','manager')),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','failed','requires_resubmission')),
  onboarding_completed boolean not null default false,
  rules_accepted_at timestamptz,
  joined_at timestamptz not null default now(),
  unique (environment, team_id, user_id)
);

create table if not exists public.sports_team_invitations (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  team_id uuid not null references public.sports_teams(id) on delete cascade,
  invited_by uuid not null references auth.users(id),
  invitee_email text,
  invitee_phone text,
  invitee_student_number text,
  invitation_code text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','declined','expired','cancelled')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sports_team_compliance (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  team_id uuid not null references public.sports_teams(id) on delete cascade,
  tournament_id text not null,
  required_player_count integer not null,
  registered_player_count integer not null default 0,
  verified_player_count integer not null default 0,
  coach_required boolean not null default false,
  coach_completed boolean not null default false,
  all_members_onboarded boolean not null default false,
  all_members_verified boolean not null default false,
  rules_accepted boolean not null default false,
  is_compliant boolean not null default false,
  compliance_completed_at timestamptz,
  queue_position integer,
  approval_status text not null default 'incomplete',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (environment, team_id, tournament_id)
);

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  title text not null,
  description text,
  campus text,
  venue text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity integer,
  attendance_code text,
  points integer not null default 0,
  status text not null default 'published' check (status in ('draft','published','closed','completed','cancelled')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.community_event_registrations (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  event_id uuid not null references public.community_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered','attended','cancelled','no_show')),
  registered_at timestamptz not null default now(),
  attendance_verified_at timestamptz,
  unique (environment, event_id, user_id)
);

create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  post_type text not null check (post_type in ('podcast','vlog','blog','news','update')),
  title text not null,
  summary text,
  body text,
  author_user_id uuid references auth.users(id),
  campus text,
  category text,
  featured_image_path text,
  media_url text,
  transcript text,
  status text not null default 'draft' check (status in ('draft','scheduled','published','archived')),
  published_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_submissions (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  user_id uuid not null references auth.users(id) on delete cascade,
  campus text,
  submission_type text not null,
  title text not null,
  summary text not null,
  source_link text,
  storage_paths jsonb not null default '[]'::jsonb,
  status text not null default 'submitted' check (status in ('draft','submitted','under_review','changes_requested','approved','scheduled','published','rejected','archived')),
  reviewer_id uuid references auth.users(id),
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  user_id uuid references auth.users(id) on delete cascade,
  campus text,
  notification_type text not null,
  title text not null,
  message text not null,
  link text,
  is_read boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.student_verifications (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  user_id uuid not null references auth.users(id) on delete cascade,
  verification_type text not null,
  document_path text,
  status text not null default 'pending' check (status in ('not_submitted','pending','verified','failed','expired','requires_resubmission')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  expires_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (environment, user_id, verification_type)
);

create table if not exists public.community_audit_logs (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  actor_user_id uuid references auth.users(id),
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_community_profiles_user on public.community_profiles(user_id, environment);
create index if not exists idx_community_role_applications_user on public.community_role_applications(user_id, environment, status);
create index if not exists idx_community_game_participants_user on public.community_game_participants(user_id, environment, status);
create index if not exists idx_community_points_user on public.community_points(user_id, environment, created_at desc);
create index if not exists idx_sports_teams_captain on public.sports_teams(captain_user_id, environment);
create index if not exists idx_sports_team_members_user on public.sports_team_members(user_id, environment);
create index if not exists idx_sports_compliance_queue on public.sports_team_compliance(environment, tournament_id, is_compliant, compliance_completed_at);
create index if not exists idx_content_submissions_user on public.content_submissions(user_id, environment, status);
create index if not exists idx_community_notifications_user on public.community_notifications(user_id, environment, is_read, created_at desc);
create index if not exists idx_student_verifications_user on public.student_verifications(user_id, environment, status);

alter table public.community_profiles enable row level security;
alter table public.community_roles enable row level security;
alter table public.community_role_applications enable row level security;
alter table public.community_role_assignments enable row level security;
alter table public.community_games enable row level security;
alter table public.community_game_participants enable row level security;
alter table public.community_game_submissions enable row level security;
alter table public.community_points enable row level security;
alter table public.community_badges enable row level security;
alter table public.community_user_badges enable row level security;
alter table public.tournaments enable row level security;
alter table public.sports_teams enable row level security;
alter table public.sports_team_members enable row level security;
alter table public.sports_team_invitations enable row level security;
alter table public.sports_team_compliance enable row level security;
alter table public.community_events enable row level security;
alter table public.community_event_registrations enable row level security;
alter table public.content_posts enable row level security;
alter table public.content_submissions enable row level security;
alter table public.community_notifications enable row level security;
alter table public.student_verifications enable row level security;
alter table public.community_audit_logs enable row level security;

create policy community_profiles_own on public.community_profiles for all using (user_id = auth.uid() or public.community_is_admin()) with check (user_id = auth.uid() or public.community_is_admin());
create policy community_roles_read on public.community_roles for select using (is_active or public.community_is_admin());
create policy community_roles_admin on public.community_roles for all using (public.community_is_admin()) with check (public.community_is_admin());
create policy community_applications_own on public.community_role_applications for select using (user_id = auth.uid() or public.community_is_admin());
create policy community_applications_insert on public.community_role_applications for insert with check (user_id = auth.uid());
create policy community_applications_update on public.community_role_applications for update using ((user_id = auth.uid() and status = 'draft') or public.community_is_admin()) with check ((user_id = auth.uid() and status in ('draft','submitted','withdrawn')) or public.community_is_admin());
create policy community_assignments_own_read on public.community_role_assignments for select using (user_id = auth.uid() or public.community_is_admin());
create policy community_assignments_admin on public.community_role_assignments for all using (public.community_is_admin()) with check (public.community_is_admin());
create policy community_games_read on public.community_games for select using (is_active or public.community_is_admin());
create policy community_games_admin on public.community_games for all using (public.community_is_admin()) with check (public.community_is_admin());
create policy game_participants_own on public.community_game_participants for all using (user_id = auth.uid() or public.community_is_admin()) with check (user_id = auth.uid() or public.community_is_admin());
create policy game_submissions_own on public.community_game_submissions for select using (exists (select 1 from public.community_game_participants p where p.id = participant_id and p.user_id = auth.uid()) or public.community_is_admin());
create policy game_submissions_insert on public.community_game_submissions for insert with check (exists (select 1 from public.community_game_participants p where p.id = participant_id and p.user_id = auth.uid()));
create policy game_submissions_admin on public.community_game_submissions for update using (public.community_is_admin()) with check (public.community_is_admin());
create policy community_points_own_read on public.community_points for select using (user_id = auth.uid() or public.community_is_admin());
create policy community_points_admin on public.community_points for all using (public.community_is_admin()) with check (public.community_is_admin());
create policy community_badges_read on public.community_badges for select using (is_active or public.community_is_admin());
create policy community_badges_admin on public.community_badges for all using (public.community_is_admin()) with check (public.community_is_admin());
create policy user_badges_own_read on public.community_user_badges for select using (user_id = auth.uid() or public.community_is_admin());
create policy user_badges_admin on public.community_user_badges for all using (public.community_is_admin()) with check (public.community_is_admin());
create policy tournaments_read on public.tournaments for select using (status <> 'draft' or public.community_is_admin());
create policy tournaments_admin on public.tournaments for all using (public.community_is_admin()) with check (public.community_is_admin());
create policy sports_teams_read on public.sports_teams for select using (captain_user_id = auth.uid() or exists (select 1 from public.sports_team_members m where m.team_id = id and m.user_id = auth.uid()) or public.community_is_admin());
create policy sports_teams_insert on public.sports_teams for insert with check (captain_user_id = auth.uid());
create policy sports_teams_update on public.sports_teams for update using (captain_user_id = auth.uid() or public.community_is_admin()) with check (captain_user_id = auth.uid() or public.community_is_admin());
create policy sports_members_read on public.sports_team_members for select using (user_id = auth.uid() or exists (select 1 from public.sports_teams t where t.id = team_id and t.captain_user_id = auth.uid()) or public.community_is_admin());
create policy sports_members_insert on public.sports_team_members for insert with check (user_id = auth.uid() or exists (select 1 from public.sports_teams t where t.id = team_id and t.captain_user_id = auth.uid()));
create policy sports_members_admin_update on public.sports_team_members for update using (public.community_is_admin()) with check (public.community_is_admin());
create policy sports_invitations_team on public.sports_team_invitations for all using (invited_by = auth.uid() or exists (select 1 from public.sports_teams t where t.id = team_id and t.captain_user_id = auth.uid()) or public.community_is_admin()) with check (invited_by = auth.uid() or public.community_is_admin());
create policy sports_compliance_team_read on public.sports_team_compliance for select using (exists (select 1 from public.sports_teams t where t.id = team_id and (t.captain_user_id = auth.uid() or exists (select 1 from public.sports_team_members m where m.team_id = t.id and m.user_id = auth.uid()))) or public.community_is_admin());
create policy sports_compliance_insert on public.sports_team_compliance for insert with check (exists (select 1 from public.sports_teams t where t.id = team_id and t.captain_user_id = auth.uid()) or public.community_is_admin());
create policy sports_compliance_admin_update on public.sports_team_compliance for update using (public.community_is_admin()) with check (public.community_is_admin());
create policy community_events_read on public.community_events for select using (status <> 'draft' or public.community_is_admin());
create policy community_events_admin on public.community_events for all using (public.community_is_admin()) with check (public.community_is_admin());
create policy event_registrations_own on public.community_event_registrations for all using (user_id = auth.uid() or public.community_is_admin()) with check (user_id = auth.uid() or public.community_is_admin());
create policy content_posts_read on public.content_posts for select using (status = 'published' or author_user_id = auth.uid() or public.community_is_admin());
create policy content_posts_admin on public.content_posts for all using (public.community_is_admin()) with check (public.community_is_admin());
create policy content_submissions_own_read on public.content_submissions for select using (user_id = auth.uid() or public.community_is_admin());
create policy content_submissions_insert on public.content_submissions for insert with check (user_id = auth.uid());
create policy content_submissions_update on public.content_submissions for update using ((user_id = auth.uid() and status = 'draft') or public.community_is_admin()) with check ((user_id = auth.uid() and status in ('draft','submitted')) or public.community_is_admin());
create policy community_notifications_read on public.community_notifications for select using (user_id is null or user_id = auth.uid() or public.community_is_admin());
create policy community_notifications_own_update on public.community_notifications for update using (user_id = auth.uid() or public.community_is_admin()) with check (user_id = auth.uid() or public.community_is_admin());
create policy community_notifications_admin on public.community_notifications for insert with check (public.community_is_admin());
create policy student_verifications_own_read on public.student_verifications for select using (user_id = auth.uid() or public.community_is_admin());
create policy student_verifications_insert on public.student_verifications for insert with check (user_id = auth.uid());
create policy student_verifications_admin_update on public.student_verifications for update using (public.community_is_admin()) with check (public.community_is_admin());
create policy community_audit_admin on public.community_audit_logs for select using (public.community_is_admin());
create policy community_audit_insert on public.community_audit_logs for insert with check (auth.uid() is not null);

insert into public.community_badges (id, title, description) values
  ('pilot-founding-member','Pilot Founding Member','Recognises participation in the My CCSF Pilot community.'),
  ('campus-explorer','Campus Explorer','Completed an approved campus exploration activity.'),
  ('safety-champion','Safety Champion','Completed verified safety learning activities.'),
  ('community-builder','Community Builder','Contributed to verified community participation.'),
  ('sports-participant','Sports Participant','Joined an approved My CCSF tournament.'),
  ('volunteer','Volunteer','Completed an approved volunteer activity.'),
  ('student-journalist','Student Journalist','Published approved student-community content.'),
  ('technical-contributor','Technical Contributor','Completed an approved technical contribution.'),
  ('ambassador','Ambassador','Assigned to an authorised My CCSF ambassador role.'),
  ('patrol-awareness-volunteer','Patrol Awareness Volunteer','Assigned to approved community safety-awareness duties.')
on conflict (id) do update set title = excluded.title, description = excluded.description;

insert into public.community_roles (id, title, category, summary, disclaimer) values
  ('campus-ambassador','Campus Ambassador','Ambassador','Promote the programme, support onboarding and represent My CCSF on campus.',null),
  ('residence-ambassador','Residence Ambassador','Ambassador','Represent My CCSF in an approved student residence.',null),
  ('crime-prevention-patrol','Crime Prevention and Campus Patrol Awareness','Crime Prevention','Support visible safety awareness, hazard reporting and approved patrol initiatives.','Participants do not replace CPS, SAPS or emergency responders and may not confront, search or detain people.'),
  ('administration-office-support','Administration and Office Support','Administration','Support applications, verification, attendance, records and community operations.',null),
  ('marketing-promotions','Marketing and Promotions','Marketing','Support campaigns, activations, student recruitment and event promotion.',null),
  ('journalism-media','Journalism, Media and Content Creation','Media','Create moderated podcasts, vlogs, blogs, interviews and community stories.',null),
  ('it-technical-support','IT and Technical Support','IT','Support testing, bug reporting, documentation and digital onboarding.','Community approval does not automatically grant administrative or developer access.'),
  ('sports-events-volunteer','Sports and Events Volunteer','Sports','Support registration, attendance, fixtures, results and event logistics.',null),
  ('general-volunteer','General Volunteer','Volunteer','Support cleanups, dialogues, donation drives, wellness and awareness activities.',null)
on conflict (id) do update set title = excluded.title, category = excluded.category, summary = excluded.summary, disclaimer = excluded.disclaimer;

insert into public.tournaments (id, environment, name, sport, campus, venue, registration_deadline, team_limit, required_player_count, coach_required, prize, status)
values
  ('pilot-soccer-2026','pilot','My CCSF Pilot Soccer Tournament','Soccer','pretoria_west','TUT Pretoria West Sports Grounds','2026-08-28T21:59:59Z',8,15,true,'Trophy, medals and community recognition','open'),
  ('pilot-netball-2026','pilot','My CCSF Pilot Netball Tournament','Netball','pretoria_west','TUT Pretoria West Netball Courts','2026-08-28T21:59:59Z',8,12,false,'Trophy, medals and community recognition','open'),
  ('official-soccer-2026','official','My CCSF Soccer Tournament','Soccer','pretoria_west','TUT Pretoria West Sports Grounds','2026-08-28T21:59:59Z',8,15,true,'Trophy, medals and community recognition','open'),
  ('official-netball-2026','official','My CCSF Netball Tournament','Netball','pretoria_west','TUT Pretoria West Netball Courts','2026-08-28T21:59:59Z',8,12,false,'Trophy, medals and community recognition','open')
on conflict (id) do update set name = excluded.name, venue = excluded.venue, registration_deadline = excluded.registration_deadline, team_limit = excluded.team_limit, required_player_count = excluded.required_player_count, coach_required = excluded.coach_required, prize = excluded.prize, status = excluded.status;

revoke all on function public.community_is_admin() from public;
grant execute on function public.community_is_admin() to authenticated;
