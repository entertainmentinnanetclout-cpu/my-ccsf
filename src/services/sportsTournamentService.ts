import imageCompression from 'browser-image-compression';
import { supabase } from '@/integrations/supabase/client';
import type {
  CommunityEnvironment,
  SportsCreateTeamInput,
  SportsFixtureSummary,
  SportsHubSnapshot,
  SportsJoinRequestStatus,
  SportsRole,
  SportsTeamStatus,
  SportsTeamSummary,
  SportsTournamentSummary,
} from '@/types/community';

const TEAM_LOGO_BUCKET = 'community-team-logos';
const CACHE_TTL_MS = 15_000;
const snapshotCache = new Map<CommunityEnvironment, { storedAt: number; value: SportsHubSnapshot }>();

const sportsApi = supabase as unknown as {
  rpc: (functionName: string, parameters?: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message?: string } | null;
  }>;
};

const FALLBACK_TOURNAMENTS: Record<CommunityEnvironment, SportsTournamentSummary[]> = {
  official: [
    fallbackTournament('official-soccer-2026', 'My CCSF Soccer Tournament', 'Soccer', 15, true, '2026-08-08T08:00:00+02:00'),
    fallbackTournament('official-netball-2026', 'My CCSF Netball Tournament', 'Netball', 12, false, '2026-08-08T09:00:00+02:00'),
  ],
  pilot: [
    fallbackTournament('pilot-soccer-2026', 'My CCSF Pilot Soccer Tournament', 'Soccer', 15, true, '2026-08-08T08:00:00+02:00'),
    fallbackTournament('pilot-netball-2026', 'My CCSF Pilot Netball Tournament', 'Netball', 12, false, '2026-08-08T09:00:00+02:00'),
  ],
};

function fallbackTournament(
  id: string,
  name: string,
  sport: 'Soccer' | 'Netball',
  requiredPlayerCount: number,
  coachRequired: boolean,
  startsAt: string,
): SportsTournamentSummary {
  return {
    id,
    name,
    sport,
    campus: 'pretoria_west',
    venue: sport === 'Soccer' ? 'TUT Pretoria West Sports Grounds' : 'TUT Pretoria West Netball Courts',
    startsAt,
    registrationDeadline: '2026-08-07T12:00:00+02:00',
    drawsPublishAt: '2026-08-07T18:00:00+02:00',
    teamLimit: 8,
    requiredPlayerCount,
    coachRequired,
    prize: 'Trophy, medals and community recognition',
    status: 'open',
    rules: [
      `A minimum of ${requiredPlayerCount} approved players is required.`,
      coachRequired ? 'At least one approved coach is required.' : 'A coach is optional for this tournament.',
      'Every approved member must use a completed My CCSF student profile.',
      'A student may not be approved for more than one team in the same tournament.',
      'The first eight teams to reach the minimum requirements are onboarded.',
    ],
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function mapTournament(raw: unknown): SportsTournamentSummary {
  const item = objectValue(raw);
  return {
    id: stringValue(item.id),
    name: stringValue(item.name),
    sport: stringValue(item.sport) === 'Netball' ? 'Netball' : 'Soccer',
    campus: nullableString(item.campus),
    venue: nullableString(item.venue),
    startsAt: stringValue(item.startsAt ?? item.starts_at),
    registrationDeadline: stringValue(item.registrationDeadline ?? item.registration_deadline),
    drawsPublishAt: stringValue(item.drawsPublishAt ?? item.draws_publish_at),
    teamLimit: numberValue(item.teamLimit ?? item.team_limit, 8),
    requiredPlayerCount: numberValue(item.requiredPlayerCount ?? item.required_player_count),
    coachRequired: booleanValue(item.coachRequired ?? item.coach_required),
    prize: nullableString(item.prize),
    status: stringValue(item.status, 'open'),
    rules: arrayValue(item.rules).filter((rule): rule is string => typeof rule === 'string'),
  };
}

function mapTeam(raw: unknown): SportsTeamSummary {
  const item = objectValue(raw);
  const roster = arrayValue(item.roster).map((entry) => {
    const member = objectValue(entry);
    return {
      userId: stringValue(member.userId ?? member.user_id),
      displayName: stringValue(member.displayName ?? member.display_name, 'TUT Student'),
      role: stringValue(member.role) === 'coach' ? 'coach' as const : 'player' as const,
      joinedAt: stringValue(member.joinedAt ?? member.joined_at),
    };
  });
  const pendingRequests = arrayValue(item.pendingRequests ?? item.pending_requests).map((entry) => {
    const request = objectValue(entry);
    const status = stringValue(request.status, 'pending') as SportsJoinRequestStatus;
    return {
      id: stringValue(request.id),
      userId: stringValue(request.userId ?? request.user_id),
      displayName: stringValue(request.displayName ?? request.display_name, 'TUT Student'),
      role: stringValue(request.role) === 'coach' ? 'coach' as const : 'player' as const,
      status,
      requestedAt: stringValue(request.requestedAt ?? request.requested_at),
    };
  });
  return {
    id: stringValue(item.id),
    environment: stringValue(item.environment) === 'pilot' ? 'pilot' : 'official',
    tournamentId: stringValue(item.tournamentId ?? item.tournament_id),
    name: stringValue(item.name),
    description: nullableString(item.description),
    affiliationType: nullableString(item.affiliationType ?? item.affiliation_type),
    affiliationName: nullableString(item.affiliationName ?? item.affiliation_name),
    logoPath: nullableString(item.logoPath ?? item.logo_path),
    creatorRole: stringValue(item.creatorRole ?? item.creator_role) === 'coach' ? 'coach' : 'player',
    status: stringValue(item.status, 'recruiting') as SportsTeamStatus,
    acceptingRequests: booleanValue(item.acceptingRequests ?? item.accepting_requests, true),
    activatedAt: nullableString(item.activatedAt ?? item.activated_at),
    queuePosition: item.queuePosition === null || item.queue_position === null
      ? null
      : numberValue(item.queuePosition ?? item.queue_position),
    approvedPlayerCount: numberValue(item.approvedPlayerCount ?? item.approved_player_count),
    approvedCoachCount: numberValue(item.approvedCoachCount ?? item.approved_coach_count),
    requiredPlayerCount: numberValue(item.requiredPlayerCount ?? item.required_player_count),
    coachRequired: booleanValue(item.coachRequired ?? item.coach_required),
    roster,
    pendingRequests,
    isOwner: booleanValue(item.isOwner ?? item.is_owner),
    myMembershipRole: stringValue(item.myMembershipRole ?? item.my_membership_role) === 'coach'
      ? 'coach'
      : stringValue(item.myMembershipRole ?? item.my_membership_role) === 'player' ? 'player' : null,
    myRequestStatus: nullableString(item.myRequestStatus ?? item.my_request_status) as SportsJoinRequestStatus | null,
    createdAt: stringValue(item.createdAt ?? item.created_at),
  };
}

function mapFixture(raw: unknown): SportsFixtureSummary {
  const item = objectValue(raw);
  return {
    id: stringValue(item.id),
    tournamentId: stringValue(item.tournamentId ?? item.tournament_id),
    roundName: stringValue(item.roundName ?? item.round_name, 'Quarter-final'),
    matchNumber: numberValue(item.matchNumber ?? item.match_number),
    homeTeamId: nullableString(item.homeTeamId ?? item.home_team_id),
    homeTeamName: stringValue(item.homeTeamName ?? item.home_team_name, 'To be confirmed'),
    awayTeamId: nullableString(item.awayTeamId ?? item.away_team_id),
    awayTeamName: stringValue(item.awayTeamName ?? item.away_team_name, 'To be confirmed'),
    scheduledAt: stringValue(item.scheduledAt ?? item.scheduled_at),
    venue: nullableString(item.venue),
    status: stringValue(item.status, 'scheduled'),
  };
}

function fallbackSnapshot(environment: CommunityEnvironment, warning?: string): SportsHubSnapshot {
  return {
    serverTime: new Date().toISOString(),
    sportsRole: null,
    tournaments: FALLBACK_TOURNAMENTS[environment],
    teams: [],
    fixtures: [],
    persistenceReady: false,
    warning,
  };
}

function clearCache(environment: CommunityEnvironment) {
  snapshotCache.delete(environment);
}

async function callRpc<T>(name: string, parameters: Record<string, unknown>): Promise<T> {
  const { data, error } = await sportsApi.rpc(name, parameters);
  if (error) throw new Error(error.message || `${name} failed.`);
  return data as T;
}

export async function loadSportsHub(
  environment: CommunityEnvironment,
  force = false,
): Promise<SportsHubSnapshot> {
  const cached = snapshotCache.get(environment);
  if (!force && cached && Date.now() - cached.storedAt < CACHE_TTL_MS) return cached.value;

  try {
    const data = objectValue(await callRpc<unknown>('community_get_sports_hub', { p_environment: environment }));
    const snapshot: SportsHubSnapshot = {
      serverTime: stringValue(data.serverTime ?? data.server_time, new Date().toISOString()),
      sportsRole: stringValue(data.sportsRole ?? data.sports_role) === 'coach'
        ? 'coach'
        : stringValue(data.sportsRole ?? data.sports_role) === 'player' ? 'player' : null,
      tournaments: arrayValue(data.tournaments).map(mapTournament),
      teams: arrayValue(data.teams).map(mapTeam),
      fixtures: arrayValue(data.fixtures).map(mapFixture),
      persistenceReady: true,
    };
    snapshotCache.set(environment, { storedAt: Date.now(), value: snapshot });
    return snapshot;
  } catch (error) {
    return fallbackSnapshot(
      environment,
      error instanceof Error
        ? `Sports database activation is still required: ${error.message}`
        : 'Sports database activation is still required.',
    );
  }
}

export async function saveSportsRole(environment: CommunityEnvironment, role: SportsRole) {
  await callRpc('community_set_sports_role', { p_environment: environment, p_role: role });
  clearCache(environment);
}

export async function createSportsTeam(input: SportsCreateTeamInput): Promise<string> {
  const teamId = await callRpc<string>('community_create_sports_team', {
    p_environment: input.environment,
    p_tournament_id: input.tournamentId,
    p_name: input.name.trim(),
    p_creator_role: input.creatorRole,
    p_affiliation_type: input.affiliationType,
    p_affiliation_name: input.affiliationName.trim() || null,
    p_description: input.description.trim() || null,
    p_rules_accepted: input.rulesAccepted,
  });
  clearCache(input.environment);
  return teamId;
}

export async function requestToJoinTeam(
  environment: CommunityEnvironment,
  teamId: string,
  role: SportsRole,
) {
  await callRpc('community_request_to_join_team', {
    p_environment: environment,
    p_team_id: teamId,
    p_role: role,
  });
  clearCache(environment);
}

export async function reviewTeamJoinRequest(
  environment: CommunityEnvironment,
  requestId: string,
  decision: 'approved' | 'rejected',
) {
  await callRpc('community_review_team_join_request', {
    p_request_id: requestId,
    p_decision: decision,
  });
  clearCache(environment);
}

export async function setTeamRecruitment(
  environment: CommunityEnvironment,
  teamId: string,
  acceptingRequests: boolean,
) {
  await callRpc('community_set_team_recruitment', {
    p_team_id: teamId,
    p_accepting_requests: acceptingRequests,
  });
  clearCache(environment);
}

export async function generateTournamentDraw(environment: CommunityEnvironment, tournamentId: string) {
  await callRpc('community_generate_tournament_draw', { p_tournament_id: tournamentId });
  clearCache(environment);
}

export async function uploadTeamLogo(input: {
  environment: CommunityEnvironment;
  userId: string;
  teamId: string;
  file: File;
}) {
  if (!input.file.type.startsWith('image/')) throw new Error('Choose a valid image file.');
  if (input.file.size > 12 * 1024 * 1024) throw new Error('The original logo must be smaller than 12 MB.');

  const compressed = await imageCompression(input.file, {
    maxSizeMB: 0.22,
    maxWidthOrHeight: 512,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: 0.82,
  });
  const path = `${input.environment}/${input.userId}/${input.teamId}/logo.webp`;
  const { error } = await supabase.storage.from(TEAM_LOGO_BUCKET).upload(path, compressed, {
    upsert: true,
    cacheControl: '31536000',
    contentType: 'image/webp',
  });
  if (error) throw new Error(error.message || 'Team logo upload failed.');

  await callRpc('community_set_team_logo', { p_team_id: input.teamId, p_logo_path: path });
  clearCache(input.environment);
  return path;
}

export function getTeamLogoUrl(path: string | null) {
  if (!path) return null;
  return supabase.storage.from(TEAM_LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function subscribeSportsHub(environment: CommunityEnvironment, onChange: () => void) {
  let timer: number | null = null;
  const schedule = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      clearCache(environment);
      onChange();
    }, 800);
  };

  let channel = supabase.channel(`community-sports-${environment}`);
  for (const table of ['sports_teams', 'sports_team_members', 'sports_team_join_requests', 'sports_fixtures'] as const) {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `environment=eq.${environment}` },
      schedule,
    );
  }
  channel.subscribe();

  return () => {
    if (timer !== null) window.clearTimeout(timer);
    void supabase.removeChannel(channel);
  };
}
