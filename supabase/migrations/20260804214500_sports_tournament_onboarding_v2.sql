-- My CCSF sports tournament onboarding v2
-- Cross-device team discovery, join requests, public approved rosters,
-- automatic minimum activation, storage-efficient logos and timed fixtures.

alter table public.community_profiles
  add column if not exists sports_role text check (sports_role in ('player','coach'));

alter table public.tournaments
  add column if not exists draws_publish_at timestamptz,
  add column if not exists is_featured boolean not null default false;

alter table public.sports_teams
  add column if not exists creator_role text check (creator_role in ('player','coach')),
  add column if not exists description text,
  add column if not exists accepting_requests boolean not null default true,
  add column if not exists rules_accepted_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists queue_position integer check (queue_position is null or queue_position > 0);

alter table public.sports_teams drop constraint if exists sports_teams_status_check;
alter table public.sports_teams
  add constraint sports_teams_status_check
  check (status in ('recruiting','activated','waitlisted','draw_published','withdrawn'));

update public.sports_teams
set status = case
  when status in ('approved','ready_for_submission','under_review') then 'activated'
  when status = 'waitlisted' then 'waitlisted'
  when status = 'withdrawn' then 'withdrawn'
  else 'recruiting'
end
where status not in ('recruiting','activated','waitlisted','draw_published','withdrawn');

alter table public.sports_team_members
  add column if not exists membership_status text not null default 'approved'
    check (membership_status in ('approved','removed')),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id);

create table if not exists public.sports_team_join_requests (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  team_id uuid not null references public.sports_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_role text not null check (requested_role in ('player','coach')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (environment, team_id, user_id)
);

create table if not exists public.sports_fixtures (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('official','pilot')),
  tournament_id text not null references public.tournaments(id) on delete cascade,
  round_name text not null default 'Quarter-final',
  match_number integer not null check (match_number > 0),
  home_team_id uuid references public.sports_teams(id) on delete set null,
  away_team_id uuid references public.sports_teams(id) on delete set null,
  scheduled_at timestamptz not null,
  venue text,
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled')),
  home_score integer,
  away_score integer,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (environment, tournament_id, round_name, match_number)
);

create index if not exists idx_sports_teams_discovery
  on public.sports_teams(environment, tournament_id, status, activated_at, created_at);
create index if not exists idx_sports_join_requests_team
  on public.sports_team_join_requests(environment, team_id, status, requested_at);
create index if not exists idx_sports_join_requests_user
  on public.sports_team_join_requests(environment, user_id, status);
create index if not exists idx_sports_fixtures_release
  on public.sports_fixtures(environment, tournament_id, scheduled_at);

alter table public.sports_team_join_requests enable row level security;
alter table public.sports_fixtures enable row level security;

drop policy if exists sports_teams_read on public.sports_teams;
create policy sports_teams_authenticated_read on public.sports_teams
  for select using (auth.uid() is not null);

drop policy if exists sports_members_read on public.sports_team_members;
create policy sports_members_public_approved_read on public.sports_team_members
  for select using (
    membership_status = 'approved'
    or user_id = auth.uid()
    or exists (
      select 1 from public.sports_teams t
      where t.id = team_id and t.captain_user_id = auth.uid()
    )
    or public.community_is_admin()
  );

drop policy if exists sports_members_insert on public.sports_team_members;
drop policy if exists sports_members_admin_update on public.sports_team_members;
create policy sports_members_admin_manage on public.sports_team_members
  for all using (public.community_is_admin()) with check (public.community_is_admin());

create policy sports_join_requests_read on public.sports_team_join_requests
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.sports_teams t
      where t.id = team_id and t.captain_user_id = auth.uid()
    )
    or public.community_is_admin()
  );
create policy sports_join_requests_admin on public.sports_team_join_requests
  for all using (public.community_is_admin()) with check (public.community_is_admin());

create policy sports_fixtures_authenticated_read on public.sports_fixtures
  for select using (auth.uid() is not null);
create policy sports_fixtures_admin_manage on public.sports_fixtures
  for all using (public.community_is_admin()) with check (public.community_is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-team-logos',
  'community-team-logos',
  true,
  524288,
  array['image/webp','image/png','image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists community_team_logos_insert on storage.objects;
drop policy if exists community_team_logos_update on storage.objects;
drop policy if exists community_team_logos_delete on storage.objects;
create policy community_team_logos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'community-team-logos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
create policy community_team_logos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'community-team-logos'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'community-team-logos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
create policy community_team_logos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'community-team-logos'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create or replace function public.community_require_completed_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if not found or coalesce(v_profile.profile_completed, false) is false then
    raise exception 'Complete your My CCSF student profile before joining the tournament.';
  end if;

  return v_profile;
end;
$$;

create or replace function public.community_set_sports_role(
  p_environment text,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if p_environment not in ('official','pilot') then
    raise exception 'Invalid community environment.';
  end if;
  if p_role not in ('player','coach') then
    raise exception 'Choose Player or Coach.';
  end if;

  v_profile := public.community_require_completed_profile();

  if exists (
    select 1 from public.sports_team_members m
    join public.sports_teams t on t.id = m.team_id
    where m.user_id = auth.uid()
      and m.environment = p_environment
      and m.membership_status = 'approved'
      and m.member_role <> p_role
  ) then
    raise exception 'Your sports role cannot change after a team has approved you.';
  end if;

  insert into public.community_profiles (environment, user_id, campus, sports_role, updated_at)
  values (p_environment, auth.uid(), v_profile.campus::text, p_role, now())
  on conflict (environment, user_id) do update set
    sports_role = excluded.sports_role,
    campus = excluded.campus,
    updated_at = now();
end;
$$;

create or replace function public.community_refresh_team_state(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.sports_teams%rowtype;
  v_tournament public.tournaments%rowtype;
  v_players integer;
  v_coaches integer;
  v_compliant boolean;
  v_position integer;
  v_next_status text;
begin
  select * into v_team from public.sports_teams where id = p_team_id for update;
  if not found then raise exception 'Team not found.'; end if;

  select * into v_tournament from public.tournaments where id = v_team.tournament_id;
  if not found then raise exception 'Tournament not found.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_team.environment || ':' || v_team.tournament_id, 0));

  select
    count(*) filter (where member_role = 'player'),
    count(*) filter (where member_role = 'coach')
  into v_players, v_coaches
  from public.sports_team_members
  where team_id = p_team_id and membership_status = 'approved';

  v_compliant := v_players >= v_tournament.required_player_count
    and (not v_tournament.coach_required or v_coaches >= 1)
    and v_team.rules_accepted_at is not null;

  if v_compliant and v_team.activated_at is null then
    select count(*) + 1 into v_position
    from public.sports_teams
    where environment = v_team.environment
      and tournament_id = v_team.tournament_id
      and activated_at is not null;

    v_next_status := case when v_position <= v_tournament.team_limit then 'activated' else 'waitlisted' end;

    update public.sports_teams
    set status = v_next_status,
        activated_at = now(),
        queue_position = v_position,
        updated_at = now()
    where id = p_team_id;
  elsif not v_compliant and v_team.activated_at is null then
    update public.sports_teams
    set status = 'recruiting', updated_at = now()
    where id = p_team_id;
    v_next_status := 'recruiting';
  else
    v_next_status := v_team.status;
    v_position := v_team.queue_position;
  end if;

  insert into public.sports_team_compliance (
    environment,
    team_id,
    tournament_id,
    required_player_count,
    registered_player_count,
    verified_player_count,
    coach_required,
    coach_completed,
    all_members_onboarded,
    all_members_verified,
    rules_accepted,
    is_compliant,
    compliance_completed_at,
    queue_position,
    approval_status,
    updated_at
  ) values (
    v_team.environment,
    p_team_id,
    v_team.tournament_id,
    v_tournament.required_player_count,
    v_players,
    v_players,
    v_tournament.coach_required,
    (not v_tournament.coach_required or v_coaches >= 1),
    true,
    true,
    v_team.rules_accepted_at is not null,
    v_compliant,
    case when v_compliant then coalesce(v_team.activated_at, now()) else null end,
    coalesce(v_position, v_team.queue_position),
    coalesce(v_next_status, v_team.status),
    now()
  )
  on conflict (environment, team_id, tournament_id) do update set
    registered_player_count = excluded.registered_player_count,
    verified_player_count = excluded.verified_player_count,
    coach_completed = excluded.coach_completed,
    all_members_onboarded = excluded.all_members_onboarded,
    all_members_verified = excluded.all_members_verified,
    rules_accepted = excluded.rules_accepted,
    is_compliant = excluded.is_compliant,
    compliance_completed_at = coalesce(public.sports_team_compliance.compliance_completed_at, excluded.compliance_completed_at),
    queue_position = coalesce(public.sports_team_compliance.queue_position, excluded.queue_position),
    approval_status = excluded.approval_status,
    updated_at = now();
end;
$$;

create or replace function public.community_create_sports_team(
  p_environment text,
  p_tournament_id text,
  p_name text,
  p_creator_role text,
  p_affiliation_type text,
  p_affiliation_name text default null,
  p_description text default null,
  p_rules_accepted boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_tournament public.tournaments%rowtype;
  v_team_id uuid;
  v_saved_role text;
begin
  if p_environment not in ('official','pilot') then raise exception 'Invalid community environment.'; end if;
  if p_creator_role not in ('player','coach') then raise exception 'Choose Player or Coach.'; end if;
  if length(trim(coalesce(p_name,''))) < 3 or length(trim(p_name)) > 60 then raise exception 'Team name must contain 3 to 60 characters.'; end if;
  if not p_rules_accepted then raise exception 'Tournament rules must be accepted.'; end if;

  v_profile := public.community_require_completed_profile();

  select sports_role into v_saved_role
  from public.community_profiles
  where environment = p_environment and user_id = auth.uid();
  if v_saved_role is distinct from p_creator_role then
    raise exception 'Your selected sports role does not match this team role.';
  end if;

  select * into v_tournament
  from public.tournaments
  where id = p_tournament_id and environment = p_environment and status = 'open';
  if not found then raise exception 'Tournament is not open.'; end if;
  if now() >= v_tournament.registration_deadline then raise exception 'Team onboarding closed at Friday 12:00.'; end if;

  if exists (
    select 1 from public.sports_team_members m
    join public.sports_teams t on t.id = m.team_id
    where m.user_id = auth.uid()
      and m.membership_status = 'approved'
      and t.environment = p_environment
      and t.tournament_id = p_tournament_id
  ) then
    raise exception 'You are already approved for a team in this tournament.';
  end if;

  insert into public.sports_teams (
    environment,
    tournament_id,
    captain_user_id,
    campus,
    name,
    affiliation_type,
    affiliation_name,
    description,
    creator_role,
    accepting_requests,
    rules_accepted_at,
    status
  ) values (
    p_environment,
    p_tournament_id,
    auth.uid(),
    v_profile.campus::text,
    trim(p_name),
    p_affiliation_type,
    nullif(trim(coalesce(p_affiliation_name,'')),''),
    nullif(trim(coalesce(p_description,'')),''),
    p_creator_role,
    true,
    now(),
    'recruiting'
  ) returning id into v_team_id;

  insert into public.sports_team_members (
    environment,
    team_id,
    user_id,
    member_role,
    membership_status,
    verification_status,
    onboarding_completed,
    rules_accepted_at,
    approved_at,
    approved_by
  ) values (
    p_environment,
    v_team_id,
    auth.uid(),
    p_creator_role,
    'approved',
    'verified',
    true,
    now(),
    now(),
    auth.uid()
  );

  perform public.community_refresh_team_state(v_team_id);

  insert into public.community_audit_logs (environment, actor_user_id, actor_role, action, entity_type, entity_id, metadata)
  values (p_environment, auth.uid(), p_creator_role, 'sports_team_created', 'sports_team', v_team_id::text, jsonb_build_object('tournament_id', p_tournament_id));

  return v_team_id;
end;
$$;

create or replace function public.community_request_to_join_team(
  p_environment text,
  p_team_id uuid,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_team public.sports_teams%rowtype;
  v_tournament public.tournaments%rowtype;
  v_saved_role text;
  v_request_id uuid;
begin
  if p_role not in ('player','coach') then raise exception 'Choose Player or Coach.'; end if;
  v_profile := public.community_require_completed_profile();

  select sports_role into v_saved_role from public.community_profiles
  where environment = p_environment and user_id = auth.uid();
  if v_saved_role is distinct from p_role then raise exception 'Your selected sports role does not match this request.'; end if;

  select * into v_team from public.sports_teams
  where id = p_team_id and environment = p_environment and status <> 'withdrawn';
  if not found then raise exception 'Team not found.'; end if;
  if not v_team.accepting_requests then raise exception 'This team is not accepting requests.'; end if;

  select * into v_tournament from public.tournaments where id = v_team.tournament_id;
  if now() >= v_tournament.registration_deadline then raise exception 'Team onboarding closed at Friday 12:00.'; end if;

  if exists (
    select 1 from public.sports_team_members m
    join public.sports_teams t on t.id = m.team_id
    where m.user_id = auth.uid()
      and m.membership_status = 'approved'
      and t.environment = p_environment
      and t.tournament_id = v_team.tournament_id
  ) then
    raise exception 'You are already approved for a team in this tournament.';
  end if;

  if p_role = 'coach' and exists (
    select 1 from public.sports_team_members
    where team_id = p_team_id and member_role = 'coach' and membership_status = 'approved'
  ) then
    raise exception 'This team already has an approved coach.';
  end if;

  insert into public.sports_team_join_requests (environment, team_id, user_id, requested_role, status, requested_at, updated_at)
  values (p_environment, p_team_id, auth.uid(), p_role, 'pending', now(), now())
  on conflict (environment, team_id, user_id) do update set
    requested_role = excluded.requested_role,
    status = 'pending',
    reviewed_by = null,
    reviewed_at = null,
    requested_at = now(),
    updated_at = now()
  returning id into v_request_id;

  insert into public.community_audit_logs (environment, actor_user_id, actor_role, action, entity_type, entity_id)
  values (p_environment, auth.uid(), p_role, 'sports_team_join_requested', 'sports_team', p_team_id::text);

  return v_request_id;
end;
$$;

create or replace function public.community_review_team_join_request(
  p_request_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.sports_team_join_requests%rowtype;
  v_team public.sports_teams%rowtype;
  v_tournament public.tournaments%rowtype;
begin
  if p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected.'; end if;

  select * into v_request from public.sports_team_join_requests where id = p_request_id for update;
  if not found then raise exception 'Join request not found.'; end if;

  select * into v_team from public.sports_teams where id = v_request.team_id for update;
  if v_team.captain_user_id <> auth.uid() and not public.community_is_admin() then
    raise exception 'Only the team creator or an administrator can review this request.';
  end if;

  select * into v_tournament from public.tournaments where id = v_team.tournament_id;
  if p_decision = 'approved' and now() >= v_tournament.registration_deadline then
    raise exception 'Team approvals closed at Friday 12:00.';
  end if;

  if p_decision = 'approved' then
    if exists (
      select 1 from public.sports_team_members m
      join public.sports_teams t on t.id = m.team_id
      where m.user_id = v_request.user_id
        and m.membership_status = 'approved'
        and t.environment = v_request.environment
        and t.tournament_id = v_team.tournament_id
    ) then
      raise exception 'This student is already approved for a team in the tournament.';
    end if;

    if v_request.requested_role = 'coach' and exists (
      select 1 from public.sports_team_members
      where team_id = v_request.team_id and member_role = 'coach' and membership_status = 'approved'
    ) then
      raise exception 'This team already has an approved coach.';
    end if;

    insert into public.sports_team_members (
      environment,
      team_id,
      user_id,
      member_role,
      membership_status,
      verification_status,
      onboarding_completed,
      rules_accepted_at,
      approved_at,
      approved_by
    ) values (
      v_request.environment,
      v_request.team_id,
      v_request.user_id,
      v_request.requested_role,
      'approved',
      'verified',
      true,
      now(),
      now(),
      auth.uid()
    )
    on conflict (environment, team_id, user_id) do update set
      member_role = excluded.member_role,
      membership_status = 'approved',
      verification_status = 'verified',
      onboarding_completed = true,
      rules_accepted_at = now(),
      approved_at = now(),
      approved_by = auth.uid();
  end if;

  update public.sports_team_join_requests
  set status = p_decision,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_request_id;

  perform public.community_refresh_team_state(v_request.team_id);

  insert into public.community_audit_logs (environment, actor_user_id, actor_role, action, entity_type, entity_id, metadata)
  values (v_request.environment, auth.uid(), 'team_owner', 'sports_join_request_' || p_decision, 'sports_team_join_request', p_request_id::text, jsonb_build_object('team_id', v_request.team_id));
end;
$$;

create or replace function public.community_set_team_recruitment(
  p_team_id uuid,
  p_accepting_requests boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sports_teams
  set accepting_requests = p_accepting_requests, updated_at = now()
  where id = p_team_id
    and (captain_user_id = auth.uid() or public.community_is_admin());
  if not found then raise exception 'Team not found or access denied.'; end if;
end;
$$;

create or replace function public.community_set_team_logo(
  p_team_id uuid,
  p_logo_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.sports_teams%rowtype;
begin
  select * into v_team from public.sports_teams where id = p_team_id;
  if not found then raise exception 'Team not found.'; end if;
  if v_team.captain_user_id <> auth.uid() and not public.community_is_admin() then raise exception 'Access denied.'; end if;
  if not public.community_is_admin() and p_logo_path not like v_team.environment || '/' || auth.uid()::text || '/' || p_team_id::text || '/%' then
    raise exception 'Invalid team logo path.';
  end if;

  update public.sports_teams set logo_path = p_logo_path, updated_at = now() where id = p_team_id;
end;
$$;

create or replace function public.community_get_sports_hub(p_environment text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if p_environment not in ('official','pilot') then raise exception 'Invalid community environment.'; end if;

  return jsonb_build_object(
    'serverTime', now(),
    'sportsRole', (
      select cp.sports_role from public.community_profiles cp
      where cp.environment = p_environment and cp.user_id = auth.uid()
    ),
    'tournaments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', tr.id,
        'name', tr.name,
        'sport', tr.sport,
        'campus', tr.campus,
        'venue', tr.venue,
        'startsAt', tr.starts_at,
        'registrationDeadline', tr.registration_deadline,
        'drawsPublishAt', tr.draws_publish_at,
        'teamLimit', tr.team_limit,
        'requiredPlayerCount', tr.required_player_count,
        'coachRequired', tr.coach_required,
        'prize', tr.prize,
        'status', tr.status,
        'rules', tr.rules
      ) order by tr.starts_at, tr.sport)
      from public.tournaments tr
      where tr.environment = p_environment and tr.status <> 'draft'
    ), '[]'::jsonb),
    'teams', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'environment', t.environment,
        'tournamentId', t.tournament_id,
        'name', t.name,
        'description', t.description,
        'affiliationType', t.affiliation_type,
        'affiliationName', t.affiliation_name,
        'logoPath', t.logo_path,
        'creatorRole', coalesce(t.creator_role, 'player'),
        'status', t.status,
        'acceptingRequests', t.accepting_requests,
        'activatedAt', t.activated_at,
        'queuePosition', t.queue_position,
        'approvedPlayerCount', (
          select count(*) from public.sports_team_members m
          where m.team_id = t.id and m.membership_status = 'approved' and m.member_role = 'player'
        ),
        'approvedCoachCount', (
          select count(*) from public.sports_team_members m
          where m.team_id = t.id and m.membership_status = 'approved' and m.member_role = 'coach'
        ),
        'requiredPlayerCount', tr.required_player_count,
        'coachRequired', tr.coach_required,
        'roster', coalesce((
          select jsonb_agg(jsonb_build_object(
            'userId', m.user_id,
            'displayName', coalesce(nullif(trim(p.full_name),''), 'TUT Student'),
            'role', m.member_role,
            'joinedAt', m.joined_at
          ) order by case when m.member_role = 'coach' then 0 else 1 end, p.full_name)
          from public.sports_team_members m
          left join public.profiles p on p.id = m.user_id
          where m.team_id = t.id and m.membership_status = 'approved'
        ), '[]'::jsonb),
        'pendingRequests', case when t.captain_user_id = auth.uid() or public.community_is_admin() then coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', r.id,
            'userId', r.user_id,
            'displayName', coalesce(nullif(trim(p.full_name),''), 'TUT Student'),
            'role', r.requested_role,
            'status', r.status,
            'requestedAt', r.requested_at
          ) order by r.requested_at)
          from public.sports_team_join_requests r
          left join public.profiles p on p.id = r.user_id
          where r.team_id = t.id and r.status = 'pending'
        ), '[]'::jsonb) else '[]'::jsonb end,
        'isOwner', t.captain_user_id = auth.uid(),
        'myMembershipRole', (
          select m.member_role from public.sports_team_members m
          where m.team_id = t.id and m.user_id = auth.uid() and m.membership_status = 'approved'
          limit 1
        ),
        'myRequestStatus', (
          select r.status from public.sports_team_join_requests r
          where r.team_id = t.id and r.user_id = auth.uid()
          order by r.updated_at desc limit 1
        ),
        'createdAt', t.created_at
      ) order by
        case t.status when 'activated' then 0 when 'draw_published' then 0 when 'recruiting' then 1 when 'waitlisted' then 2 else 3 end,
        t.queue_position nulls last,
        t.created_at)
      from public.sports_teams t
      join public.tournaments tr on tr.id = t.tournament_id
      where t.environment = p_environment and t.status <> 'withdrawn'
    ), '[]'::jsonb),
    'fixtures', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'tournamentId', f.tournament_id,
        'roundName', f.round_name,
        'matchNumber', f.match_number,
        'homeTeamId', f.home_team_id,
        'homeTeamName', coalesce(ht.name, 'To be confirmed'),
        'awayTeamId', f.away_team_id,
        'awayTeamName', coalesce(at.name, 'BYE'),
        'scheduledAt', f.scheduled_at,
        'venue', f.venue,
        'status', f.status
      ) order by f.scheduled_at, f.match_number)
      from public.sports_fixtures f
      join public.tournaments tr on tr.id = f.tournament_id
      left join public.sports_teams ht on ht.id = f.home_team_id
      left join public.sports_teams at on at.id = f.away_team_id
      where f.environment = p_environment
        and now() >= tr.draws_publish_at
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.community_generate_tournament_draw(p_tournament_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_teams uuid[];
  v_count integer;
  v_index integer;
  v_home uuid;
  v_away uuid;
begin
  if not public.community_is_admin() then raise exception 'Administrator access is required.'; end if;

  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'Tournament not found.'; end if;
  if now() < v_tournament.registration_deadline then raise exception 'Generate the draw after team onboarding closes at Friday 12:00.'; end if;

  select array_agg(id order by md5(id::text || p_tournament_id)) into v_teams
  from (
    select id from public.sports_teams
    where environment = v_tournament.environment
      and tournament_id = p_tournament_id
      and status in ('activated','draw_published')
      and queue_position <= v_tournament.team_limit
    order by queue_position
    limit v_tournament.team_limit
  ) selected;

  v_count := coalesce(array_length(v_teams, 1), 0);
  if v_count < 2 then raise exception 'At least two onboarded teams are required for a draw.'; end if;

  delete from public.sports_fixtures
  where environment = v_tournament.environment and tournament_id = p_tournament_id;

  for v_index in 1..ceil(v_count / 2.0)::integer loop
    v_home := v_teams[v_index];
    v_away := case when v_count + 1 - v_index > v_index then v_teams[v_count + 1 - v_index] else null end;

    insert into public.sports_fixtures (
      environment,
      tournament_id,
      round_name,
      match_number,
      home_team_id,
      away_team_id,
      scheduled_at,
      venue,
      status,
      created_by
    ) values (
      v_tournament.environment,
      p_tournament_id,
      case when v_count >= 8 then 'Quarter-final' when v_count >= 4 then 'Semi-final' else 'Final' end,
      v_index,
      v_home,
      v_away,
      v_tournament.starts_at + ((v_index - 1) * interval '75 minutes'),
      v_tournament.venue,
      'scheduled',
      auth.uid()
    );
  end loop;

  update public.sports_teams
  set status = 'draw_published', updated_at = now()
  where id = any(v_teams) and status = 'activated';

  update public.tournaments set status = 'fixtures_published', updated_at = now()
  where id = p_tournament_id;

  insert into public.community_audit_logs (environment, actor_user_id, actor_role, action, entity_type, entity_id, metadata)
  values (v_tournament.environment, auth.uid(), 'admin', 'sports_draw_generated', 'tournament', p_tournament_id, jsonb_build_object('team_count', v_count, 'visible_at', v_tournament.draws_publish_at));

  return v_count;
end;
$$;

revoke all on function public.community_require_completed_profile() from public, anon;
revoke all on function public.community_refresh_team_state(uuid) from public, anon, authenticated;
revoke all on function public.community_set_sports_role(text,text) from public, anon;
revoke all on function public.community_create_sports_team(text,text,text,text,text,text,text,boolean) from public, anon;
revoke all on function public.community_request_to_join_team(text,uuid,text) from public, anon;
revoke all on function public.community_review_team_join_request(uuid,text) from public, anon;
revoke all on function public.community_set_team_recruitment(uuid,boolean) from public, anon;
revoke all on function public.community_set_team_logo(uuid,text) from public, anon;
revoke all on function public.community_get_sports_hub(text) from public, anon;
revoke all on function public.community_generate_tournament_draw(text) from public, anon;

grant execute on function public.community_set_sports_role(text,text) to authenticated;
grant execute on function public.community_create_sports_team(text,text,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.community_request_to_join_team(text,uuid,text) to authenticated;
grant execute on function public.community_review_team_join_request(uuid,text) to authenticated;
grant execute on function public.community_set_team_recruitment(uuid,boolean) to authenticated;
grant execute on function public.community_set_team_logo(uuid,text) to authenticated;
grant execute on function public.community_get_sports_hub(text) to authenticated;
grant execute on function public.community_generate_tournament_draw(text) to authenticated;

insert into public.tournaments (
  id,
  environment,
  name,
  sport,
  campus,
  venue,
  starts_at,
  registration_deadline,
  draws_publish_at,
  team_limit,
  required_player_count,
  coach_required,
  rules,
  prize,
  status,
  is_featured
) values
  (
    'official-soccer-2026','official','My CCSF Soccer Tournament','Soccer','pretoria_west','TUT Pretoria West Sports Grounds',
    '2026-08-08T08:00:00+02:00','2026-08-07T12:00:00+02:00','2026-08-07T18:00:00+02:00',
    8,15,true,
    '["Minimum 15 approved TUT student players.","At least one approved coach is required.","Approved roster names and roles are visible inside the tournament community.","Student numbers and contact details remain private.","The first eight teams to reach the minimum are onboarded."]'::jsonb,
    'Trophy, medals and community recognition','open',true
  ),
  (
    'official-netball-2026','official','My CCSF Netball Tournament','Netball','pretoria_west','TUT Pretoria West Netball Courts',
    '2026-08-08T09:00:00+02:00','2026-08-07T12:00:00+02:00','2026-08-07T18:00:00+02:00',
    8,12,false,
    '["Minimum 12 approved TUT student players.","A coach is optional.","Approved roster names and roles are visible inside the tournament community.","Student numbers and contact details remain private.","The first eight teams to reach the minimum are onboarded."]'::jsonb,
    'Trophy, medals and community recognition','open',true
  ),
  (
    'pilot-soccer-2026','pilot','My CCSF Pilot Soccer Tournament','Soccer','pretoria_west','TUT Pretoria West Sports Grounds',
    '2026-08-08T08:00:00+02:00','2026-08-07T12:00:00+02:00','2026-08-07T18:00:00+02:00',
    8,15,true,
    '["Minimum 15 approved TUT student players.","At least one approved coach is required.","Approved roster names and roles are visible inside the Pilot community.","Student numbers and contact details remain private.","The first eight teams to reach the minimum are onboarded."]'::jsonb,
    'Trophy, medals and community recognition','open',true
  ),
  (
    'pilot-netball-2026','pilot','My CCSF Pilot Netball Tournament','Netball','pretoria_west','TUT Pretoria West Netball Courts',
    '2026-08-08T09:00:00+02:00','2026-08-07T12:00:00+02:00','2026-08-07T18:00:00+02:00',
    8,12,false,
    '["Minimum 12 approved TUT student players.","A coach is optional.","Approved roster names and roles are visible inside the Pilot community.","Student numbers and contact details remain private.","The first eight teams to reach the minimum are onboarded."]'::jsonb,
    'Trophy, medals and community recognition','open',true
  )
on conflict (id) do update set
  name = excluded.name,
  sport = excluded.sport,
  campus = excluded.campus,
  venue = excluded.venue,
  starts_at = excluded.starts_at,
  registration_deadline = excluded.registration_deadline,
  draws_publish_at = excluded.draws_publish_at,
  team_limit = excluded.team_limit,
  required_player_count = excluded.required_player_count,
  coach_required = excluded.coach_required,
  rules = excluded.rules,
  prize = excluded.prize,
  status = excluded.status,
  is_featured = excluded.is_featured,
  updated_at = now();
