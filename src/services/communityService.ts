import { supabase } from '@/integrations/supabase/client';
import type {
  CommunityContentSubmissionInput,
  CommunityEnvironment,
  CommunityLocalState,
  CommunityParticipationRecord,
  CommunityRoleApplicationInput,
  CommunityTeamInput,
  CommunityTournament,
} from '@/types/community';

const EMPTY_STATE: CommunityLocalState = {
  points: 0,
  badges: ['Pilot Founding Member'],
  records: [],
  leaderboardPrivacy: 'first_name',
  nickname: '',
};

const storageKey = (environment: CommunityEnvironment, userId: string) => `my-ccsf-community:${environment}:${userId}`;
const newId = () => globalThis.crypto?.randomUUID?.() ?? `community-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const communityDb = supabase as unknown as {
  from: (table: string) => {
    insert: (value: unknown) => Promise<{ error: { message?: string } | null }>;
    select: (columns?: string) => {
      eq: (column: string, value: unknown) => Promise<{ data: unknown[] | null; error: { message?: string } | null }>;
    };
  };
};

function readLocal(environment: CommunityEnvironment, userId: string): CommunityLocalState {
  if (typeof window === 'undefined') return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(storageKey(environment, userId));
    if (!raw) return { ...EMPTY_STATE, badges: [...EMPTY_STATE.badges], records: [] };
    const parsed = JSON.parse(raw) as Partial<CommunityLocalState>;
    return {
      points: Number(parsed.points ?? 0),
      badges: Array.isArray(parsed.badges) ? parsed.badges.filter((item): item is string => typeof item === 'string') : [...EMPTY_STATE.badges],
      records: Array.isArray(parsed.records) ? parsed.records as CommunityParticipationRecord[] : [],
      leaderboardPrivacy: parsed.leaderboardPrivacy ?? 'first_name',
      nickname: parsed.nickname ?? '',
    };
  } catch {
    return { ...EMPTY_STATE, badges: [...EMPTY_STATE.badges], records: [] };
  }
}

function writeLocal(environment: CommunityEnvironment, userId: string, state: CommunityLocalState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(environment, userId), JSON.stringify(state));
}

async function bestEffortInsert(table: string, value: unknown) {
  try {
    const { error } = await communityDb.from(table).insert(value);
    if (error) console.info(`Community table ${table} is not active in this environment yet:`, error.message);
  } catch (error) {
    console.info(`Community persistence for ${table} is using device fallback:`, error);
  }
}

function addRecord(
  environment: CommunityEnvironment,
  userId: string,
  record: Omit<CommunityParticipationRecord, 'id' | 'createdAt'>,
  badge?: string,
) {
  const state = readLocal(environment, userId);
  const nextRecord: CommunityParticipationRecord = {
    ...record,
    id: newId(),
    createdAt: new Date().toISOString(),
  };
  const badges = badge && !state.badges.includes(badge) ? [...state.badges, badge] : state.badges;
  const next = {
    ...state,
    points: state.points + Number(record.points ?? 0),
    badges,
    records: [nextRecord, ...state.records],
  };
  writeLocal(environment, userId, next);
  return next;
}

export function loadCommunityState(environment: CommunityEnvironment, userId: string) {
  return readLocal(environment, userId);
}

export function updateLeaderboardPrivacy(
  environment: CommunityEnvironment,
  userId: string,
  privacy: CommunityLocalState['leaderboardPrivacy'],
  nickname: string,
) {
  const current = readLocal(environment, userId);
  const next = { ...current, leaderboardPrivacy: privacy, nickname };
  writeLocal(environment, userId, next);
  return next;
}

export async function joinCommunityGame(input: {
  environment: CommunityEnvironment;
  userId: string;
  gameId: string;
  title: string;
  points: number;
  badge: string;
}) {
  const state = addRecord(input.environment, input.userId, {
    kind: 'game',
    title: input.title,
    status: 'Joined',
    progress: 0,
    points: Math.min(input.points, 25),
    metadata: { gameId: input.gameId, verificationRequiredForRemainingPoints: true },
  }, input.badge);

  await bestEffortInsert('community_game_participants', {
    id: newId(),
    environment: input.environment,
    user_id: input.userId,
    game_id: input.gameId,
    status: 'active',
    points_awarded: 0,
  });

  return state;
}

export async function submitCommunityRoleApplication(input: {
  environment: CommunityEnvironment;
  userId: string;
  campus?: string | null;
  application: CommunityRoleApplicationInput;
}) {
  const status = input.application.status === 'draft' ? 'Draft' : 'Submitted';
  const state = addRecord(input.environment, input.userId, {
    kind: 'role',
    title: input.application.selectedRole,
    status,
    points: 0,
    metadata: { secondaryRole: input.application.secondaryRole },
  });

  await bestEffortInsert('community_role_applications', {
    id: newId(),
    environment: input.environment,
    user_id: input.userId,
    campus: input.campus ?? null,
    selected_role: input.application.selectedRole,
    secondary_role: input.application.secondaryRole || null,
    faculty: input.application.faculty,
    course: input.application.course,
    year_of_study: input.application.yearOfStudy,
    residence: input.application.residence || null,
    relevant_skills: input.application.relevantSkills,
    experience: input.application.experience,
    motivation: input.application.motivation,
    weekly_availability: input.application.weeklyAvailability,
    preferred_days: input.application.preferredDays,
    preferred_times: input.application.preferredTimes,
    has_smartphone: input.application.hasSmartphone,
    has_laptop: input.application.hasLaptop,
    has_drivers_licence: input.application.hasDriversLicence,
    portfolio_link: input.application.portfolioLink || null,
    consent_accepted: input.application.consentAccepted,
    code_of_conduct_accepted: input.application.codeOfConductAccepted,
    status: input.application.status,
  });

  return state;
}

export function calculateTeamCompliance(tournament: CommunityTournament, input: CommunityTeamInput) {
  const playerTargetReached = input.registeredPlayers >= tournament.requiredPlayers;
  const verificationTargetReached = input.verifiedPlayers >= tournament.requiredPlayers;
  const coachCompleted = !tournament.coachRequired || Boolean(input.coachName.trim() && input.coachEmail.trim());
  const isCompliant = playerTargetReached
    && verificationTargetReached
    && input.allMembersOnboarded
    && coachCompleted
    && input.rulesAccepted;

  return {
    playerTargetReached,
    verificationTargetReached,
    coachCompleted,
    isCompliant,
    status: isCompliant ? 'ready_for_submission' : input.invitedPlayers > 0 ? 'awaiting_players' : 'incomplete',
  } as const;
}

export async function submitCommunityTeam(input: {
  environment: CommunityEnvironment;
  userId: string;
  campus?: string | null;
  tournament: CommunityTournament;
  team: CommunityTeamInput;
}) {
  const compliance = calculateTeamCompliance(input.tournament, input.team);
  const state = addRecord(input.environment, input.userId, {
    kind: 'team',
    title: input.team.teamName,
    status: compliance.isCompliant ? 'Ready for Submission' : 'Awaiting Players',
    points: 0,
    metadata: {
      tournament: input.tournament.name,
      requiredPlayers: input.tournament.requiredPlayers,
      registeredPlayers: input.team.registeredPlayers,
      verifiedPlayers: input.team.verifiedPlayers,
      coachCompleted: compliance.coachCompleted,
    },
  });

  const teamId = newId();
  await bestEffortInsert('sports_teams', {
    id: teamId,
    environment: input.environment,
    tournament_id: input.tournament.id,
    captain_user_id: input.userId,
    campus: input.campus ?? null,
    name: input.team.teamName,
    affiliation_type: input.team.affiliationType,
    affiliation_name: input.team.affiliationName,
    coach_name: input.team.coachName || null,
    coach_email: input.team.coachEmail || null,
    status: compliance.status,
  });
  await bestEffortInsert('sports_team_compliance', {
    id: newId(),
    environment: input.environment,
    team_id: teamId,
    tournament_id: input.tournament.id,
    required_player_count: input.tournament.requiredPlayers,
    registered_player_count: input.team.registeredPlayers,
    verified_player_count: input.team.verifiedPlayers,
    coach_required: input.tournament.coachRequired,
    coach_completed: compliance.coachCompleted,
    all_members_onboarded: input.team.allMembersOnboarded,
    all_members_verified: compliance.verificationTargetReached,
    rules_accepted: input.team.rulesAccepted,
    is_compliant: compliance.isCompliant,
    compliance_completed_at: compliance.isCompliant ? new Date().toISOString() : null,
    approval_status: compliance.status,
  });

  return { state, compliance };
}

export async function submitCommunityContent(input: {
  environment: CommunityEnvironment;
  userId: string;
  campus?: string | null;
  submission: CommunityContentSubmissionInput;
}) {
  const status = input.submission.status === 'draft' ? 'Draft' : 'Submitted for moderation';
  const state = addRecord(input.environment, input.userId, {
    kind: 'content',
    title: input.submission.title,
    status,
    points: 0,
    metadata: { type: input.submission.type },
  });

  await bestEffortInsert('content_submissions', {
    id: newId(),
    environment: input.environment,
    user_id: input.userId,
    campus: input.campus ?? null,
    submission_type: input.submission.type,
    title: input.submission.title,
    summary: input.submission.summary,
    source_link: input.submission.link || null,
    status: input.submission.status,
  });

  return state;
}

export async function loadCommunityAdminMetrics(environment: CommunityEnvironment) {
  const metrics = {
    members: 0,
    applications: 0,
    games: 0,
    teams: 0,
    compliantTeams: 0,
    contentSubmissions: 0,
  };

  try {
    const tableMap = [
      ['community_profiles', 'members'],
      ['community_role_applications', 'applications'],
      ['community_games', 'games'],
      ['sports_teams', 'teams'],
      ['content_submissions', 'contentSubmissions'],
    ] as const;
    await Promise.all(tableMap.map(async ([table, key]) => {
      const { data, error } = await communityDb.from(table).select('id').eq('environment', environment);
      if (!error) metrics[key] = data?.length ?? 0;
    }));
    const { data, error } = await communityDb.from('sports_team_compliance').select('id').eq('environment', environment);
    if (!error) metrics.compliantTeams = data?.length ?? 0;
  } catch {
    // The preview continues with zeroed metrics until the migration is activated.
  }

  return metrics;
}
