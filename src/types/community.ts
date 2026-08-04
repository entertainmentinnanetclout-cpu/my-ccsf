export type CommunityEnvironment = 'official' | 'pilot';
export type CommunitySection = 'overview' | 'games' | 'sports' | 'join' | 'media' | 'participation';
export type CommunityApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'interview_required'
  | 'approved'
  | 'waitlisted'
  | 'rejected'
  | 'active'
  | 'suspended'
  | 'completed'
  | 'withdrawn';
export type CommunityVerificationStatus = 'not_submitted' | 'pending' | 'verified' | 'failed' | 'expired' | 'requires_resubmission';
export type CommunitySubmissionStatus = 'draft' | 'submitted' | 'under_review' | 'changes_requested' | 'approved' | 'scheduled' | 'published' | 'rejected' | 'archived';
export type TeamApprovalStatus = 'incomplete' | 'awaiting_players' | 'ready_for_submission' | 'under_review' | 'approved' | 'waitlisted' | 'rejected' | 'withdrawn';
export type SportsRole = 'player' | 'coach';
export type SportsTeamStatus = 'recruiting' | 'activated' | 'waitlisted' | 'draw_published' | 'withdrawn';
export type SportsJoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface CommunityIdentity {
  userId: string;
  fullName: string;
  email: string;
  studentNumber?: string;
  campus?: string | null;
  course?: string;
  yearOfStudy?: string;
  profileCompleted: boolean;
}

export interface CommunityGame {
  id: string;
  title: string;
  type: 'treasure_hunt' | 'spot_building' | 'safety_quiz' | 'scenario' | 'check_in' | 'mission';
  description: string;
  campus: string;
  difficulty: 'Easy' | 'Moderate' | 'Advanced';
  estimatedMinutes: number;
  points: number;
  badge: string;
  prize?: string;
  closingDate?: string;
  participantMode: 'Individual' | 'Team' | 'Individual or team';
  safetyNotice: string;
  featured?: boolean;
  progress?: number;
}

export interface CommunityTournament {
  id: string;
  name: string;
  sport: 'Soccer' | 'Netball' | string;
  date: string;
  time: string;
  venue: string;
  campus: string;
  registrationDeadline: string;
  teamLimit: number;
  approvedTeams: number;
  requiredPlayers: number;
  coachRequired: boolean;
  prize: string;
  status: 'Open' | 'Closing soon' | 'Closed' | 'Fixtures published';
  rules: string[];
}

export interface CommunityRoleOpportunity {
  id: string;
  title: string;
  category: 'Ambassador' | 'Crime Prevention' | 'Administration' | 'Marketing' | 'Media' | 'IT' | 'Sports' | 'Volunteer';
  summary: string;
  responsibilities: string[];
  skills: string[];
  disclaimer?: string;
  featured?: boolean;
}

export interface CommunityMediaItem {
  id: string;
  type: 'podcast' | 'vlog' | 'blog' | 'update';
  title: string;
  description: string;
  category: string;
  author: string;
  publishedAt: string;
  duration?: string;
  readingTime?: string;
  featured?: boolean;
}

export interface CommunityParticipationRecord {
  id: string;
  kind: 'game' | 'team' | 'role' | 'event' | 'content';
  title: string;
  status: string;
  progress?: number;
  points?: number;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface CommunityLocalState {
  points: number;
  badges: string[];
  records: CommunityParticipationRecord[];
  leaderboardPrivacy: 'full_name' | 'first_name' | 'nickname' | 'hidden';
  nickname: string;
}

export interface CommunityRoleApplicationInput {
  selectedRole: string;
  secondaryRole: string;
  faculty: string;
  course: string;
  yearOfStudy: string;
  residence: string;
  relevantSkills: string;
  experience: string;
  motivation: string;
  weeklyAvailability: string;
  preferredDays: string;
  preferredTimes: string;
  hasSmartphone: boolean;
  hasLaptop: boolean;
  hasDriversLicence: boolean;
  portfolioLink: string;
  consentAccepted: boolean;
  codeOfConductAccepted: boolean;
  status: CommunityApplicationStatus;
}

export interface CommunityTeamInput {
  tournamentId: string;
  teamName: string;
  affiliationType: 'Residence' | 'Faculty' | 'Course' | 'Campus community' | 'Independent';
  affiliationName: string;
  coachName: string;
  coachEmail: string;
  invitedPlayers: number;
  registeredPlayers: number;
  verifiedPlayers: number;
  allMembersOnboarded: boolean;
  rulesAccepted: boolean;
}

export interface CommunityContentSubmissionInput {
  type: 'blog' | 'news_tip' | 'podcast_idea' | 'vlog' | 'photos' | 'event_coverage' | 'community_story' | 'sports_update';
  title: string;
  summary: string;
  link: string;
  status: CommunitySubmissionStatus;
}

export interface SportsTournamentSummary {
  id: string;
  name: string;
  sport: 'Soccer' | 'Netball';
  campus: string | null;
  venue: string | null;
  startsAt: string;
  registrationDeadline: string;
  drawsPublishAt: string;
  teamLimit: number;
  requiredPlayerCount: number;
  coachRequired: boolean;
  prize: string | null;
  status: string;
  rules: string[];
}

export interface SportsTeamMemberSummary {
  userId: string;
  displayName: string;
  role: SportsRole;
  joinedAt: string;
}

export interface SportsJoinRequestSummary {
  id: string;
  userId: string;
  displayName: string;
  role: SportsRole;
  status: SportsJoinRequestStatus;
  requestedAt: string;
}

export interface SportsTeamSummary {
  id: string;
  environment: CommunityEnvironment;
  tournamentId: string;
  name: string;
  description: string | null;
  affiliationType: string | null;
  affiliationName: string | null;
  logoPath: string | null;
  creatorRole: SportsRole;
  status: SportsTeamStatus;
  acceptingRequests: boolean;
  activatedAt: string | null;
  queuePosition: number | null;
  approvedPlayerCount: number;
  approvedCoachCount: number;
  requiredPlayerCount: number;
  coachRequired: boolean;
  roster: SportsTeamMemberSummary[];
  pendingRequests: SportsJoinRequestSummary[];
  isOwner: boolean;
  myMembershipRole: SportsRole | null;
  myRequestStatus: SportsJoinRequestStatus | null;
  createdAt: string;
}

export interface SportsFixtureSummary {
  id: string;
  tournamentId: string;
  roundName: string;
  matchNumber: number;
  homeTeamId: string | null;
  homeTeamName: string;
  awayTeamId: string | null;
  awayTeamName: string;
  scheduledAt: string;
  venue: string | null;
  status: string;
}

export interface SportsHubSnapshot {
  serverTime: string;
  sportsRole: SportsRole | null;
  tournaments: SportsTournamentSummary[];
  teams: SportsTeamSummary[];
  fixtures: SportsFixtureSummary[];
  persistenceReady: boolean;
  warning?: string;
}

export interface SportsCreateTeamInput {
  environment: CommunityEnvironment;
  tournamentId: string;
  name: string;
  description: string;
  affiliationType: 'Residence' | 'Faculty' | 'Course' | 'Campus community' | 'Independent';
  affiliationName: string;
  creatorRole: SportsRole;
  rulesAccepted: boolean;
}
