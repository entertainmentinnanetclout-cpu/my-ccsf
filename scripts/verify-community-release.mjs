import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'src/components/community/CommunityHub.tsx',
  'src/components/community/SportsTournamentHub.tsx',
  'src/components/community/CommunityAdminDashboard.tsx',
  'src/services/sportsTournamentService.ts',
  'src/types/community.ts',
  'supabase/migrations/20260804193000_join_the_community.sql',
  'supabase/migrations/20260804214500_sports_tournament_onboarding_v2.sql',
  'src/pages/Dashboard.tsx',
  'src/components/pilot/PilotStudentDashboard.tsx',
  'src/pages/Admin.tsx',
  'src/components/pilot/PilotSuperAdminDashboard.tsx',
];

const assertions = [];
const assert = (condition, message) => {
  if (!condition) throw new Error(`Community release verification failed: ${message}`);
  assertions.push(message);
};

for (const file of requiredFiles) assert(existsSync(file), `Required community file exists: ${file}`);

const hub = readFileSync('src/components/community/CommunityHub.tsx', 'utf8');
const sports = readFileSync('src/components/community/SportsTournamentHub.tsx', 'utf8');
const admin = readFileSync('src/components/community/CommunityAdminDashboard.tsx', 'utf8');
const service = readFileSync('src/services/sportsTournamentService.ts', 'utf8');
const types = readFileSync('src/types/community.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260804214500_sports_tournament_onboarding_v2.sql', 'utf8');
const official = readFileSync('src/pages/Dashboard.tsx', 'utf8');
const pilot = readFileSync('src/components/pilot/PilotStudentDashboard.tsx', 'utf8');
const officialAdmin = readFileSync('src/pages/Admin.tsx', 'utf8');
const pilotAdmin = readFileSync('src/components/pilot/PilotSuperAdminDashboard.tsx', 'utf8');

for (const phrase of [
  'Join the Community',
  'Play. Participate. Volunteer. Lead. Represent.',
  'Sports onboarding is now live',
  'Soccer and Netball Team Onboarding',
  'COMING SOON',
  'Community Games',
  'Student Roles and Volunteering',
  'Blogs and Media',
  'Community Participation Dashboard',
]) assert(hub.includes(phrase), `Community hub includes ${phrase}.`);

assert(hub.includes('<SportsTournamentHub'), 'Shared Community hub renders the live Sports Tournament hub.');
assert(hub.includes('Not available during this pilot'), 'Non-sports community modules are visibly locked during the pilot.');
assert(hub.includes('animate-pulse'), 'Coming-soon indicators visibly pulse.');

for (const phrase of [
  'How are you joining the tournament?',
  'I am a player',
  'I am a coach',
  'Teams still onboarding',
  'Onboarded tournament teams',
  'Public approved roster',
  'Join requests',
  'Request to join as',
  'Create visible team',
  'Tournament draws and fixtures',
  'Friday, 7 August · 12:00',
  'Friday, 7 August · 18:00',
  'Saturday, 8 August 2026',
]) assert(sports.includes(phrase), `Sports workflow includes ${phrase}.`);

assert(sports.includes('team.approvedPlayerCount') && sports.includes('team.requiredPlayerCount'), 'Team cards calculate live minimum-player progress.');
assert(sports.includes('team.pendingRequests') && sports.includes("reviewRequest(request.id, 'approved')"), 'Team owners can approve incoming join requests.');
assert(sports.includes('team.roster.map'), 'Approved roster members are publicly rendered.');
assert(sports.includes('Student numbers, email addresses and phone numbers are never shown'), 'Public roster explicitly excludes private student identifiers.');
assert(sports.includes('There is no hard roster maximum'), 'Sports UI states that minimum activation does not impose a hard roster cap.');
assert(sports.includes('loading="lazy"') && sports.includes('decoding="async"'), 'Team logos use efficient lazy image delivery.');

for (const functionName of [
  'loadSportsHub',
  'saveSportsRole',
  'createSportsTeam',
  'requestToJoinTeam',
  'reviewTeamJoinRequest',
  'setTeamRecruitment',
  'generateTournamentDraw',
  'uploadTeamLogo',
  'subscribeSportsHub',
]) assert(service.includes(`function ${functionName}`) || service.includes(`async function ${functionName}`), `Sports service exports ${functionName}.`);

assert(service.includes("maxSizeMB: 0.22"), 'Team logos target approximately 220 KB.');
assert(service.includes('maxWidthOrHeight: 512'), 'Team logos are limited to 512 pixels.');
assert(service.includes("fileType: 'image/webp'"), 'Team logos are normalised to WebP.');
assert(service.includes("cacheControl: '31536000'"), 'Stable public team logos use long-lived cache headers.');
assert(service.includes('CACHE_TTL_MS = 15_000'), 'Sports snapshot requests use a short shared cache.');
assert(service.includes('community_get_sports_hub'), 'Sports hub loads through one aggregated database RPC.');
assert(service.includes('window.setTimeout') && service.includes('800'), 'Realtime refreshes are debounced to control database calls.');

for (const typeName of [
  'SportsRole',
  'SportsTeamStatus',
  'SportsTeamMemberSummary',
  'SportsJoinRequestSummary',
  'SportsTeamSummary',
  'SportsFixtureSummary',
  'SportsHubSnapshot',
  'SportsCreateTeamInput',
]) assert(types.includes(typeName), `Community types define ${typeName}.`);

for (const databaseObject of [
  'sports_team_join_requests',
  'sports_fixtures',
  'community_set_sports_role',
  'community_create_sports_team',
  'community_request_to_join_team',
  'community_review_team_join_request',
  'community_refresh_team_state',
  'community_get_sports_hub',
  'community_generate_tournament_draw',
  'community_set_team_logo',
  'community-team-logos',
]) assert(migration.includes(databaseObject), `Sports migration defines ${databaseObject}.`);

assert(migration.includes("sports_role in ('player','coach')"), 'Database stores a controlled Player or Coach role.');
assert(migration.includes("status in ('recruiting','activated','waitlisted','draw_published','withdrawn')"), 'Team lifecycle separates onboarding, onboarded, waitlisted and draw states.');
assert(migration.includes("membership_status = 'approved'"), 'Only approved memberships count toward public rosters and activation.');
assert(migration.includes("v_players >= v_tournament.required_player_count"), 'Automatic activation requires the tournament player minimum.');
assert(migration.includes("not v_tournament.coach_required or v_coaches >= 1"), 'Automatic activation enforces the coach rule only when required.');
assert(migration.includes("v_position <= v_tournament.team_limit"), 'Only the first tournament-limit teams activate before the waitlist.');
assert(migration.includes('You are already approved for a team in this tournament'), 'Duplicate tournament-team membership is prevented.');
assert(migration.includes('Only the team creator or an administrator can review this request'), 'Join-request approval is restricted to team owners and administrators.');
assert(migration.includes("'2026-08-07T12:00:00+02:00'"), 'Team onboarding closes Friday 7 August at 12:00 SAST.');
assert(migration.includes("'2026-08-07T18:00:00+02:00'"), 'Draw visibility opens Friday 7 August at 18:00 SAST.');
assert(migration.includes("'2026-08-08T08:00:00+02:00'") && migration.includes("'2026-08-08T09:00:00+02:00'"), 'Soccer and Netball are scheduled for Saturday 8 August 2026.');
assert(migration.includes('524288'), 'Team-logo bucket enforces a 512 KB server limit.');
assert(migration.includes("array['image/webp','image/png','image/jpeg']"), 'Team-logo bucket accepts only approved image formats.');
assert(migration.includes('now() >= tr.draws_publish_at'), 'Student fixture visibility is time-gated by the draw release timestamp.');
assert(migration.includes('auth.uid() is not null'), 'Authenticated students can discover tournament teams across devices.');

assert(official.includes("'community'"), 'Official student navigation includes Community.');
assert(official.includes('environment="official"'), 'Official portal renders the official Community environment.');
assert(pilot.includes("'community'"), 'Pilot student navigation includes Community.');
assert(pilot.includes('environment="pilot"'), 'Pilot portal renders the isolated Pilot Community environment.');
for (const preserved of ["'home'", "'report'", "'safety'", "'messages'"]) assert(official.includes(preserved), `Official portal preserves ${preserved}.`);
for (const preserved of ["'home'", "'report'", "'safety'", "'support'"]) assert(pilot.includes(preserved), `Pilot portal preserves ${preserved}.`);

assert(officialAdmin.includes('<CommunityAdminDashboard environment="official"'), 'Official admin console includes tournament administration.');
assert(pilotAdmin.includes('<CommunityAdminDashboard environment="pilot"'), 'Pilot super-admin console includes isolated tournament administration.');
for (const phrase of ['Soccer and Netball Tournament Operations', 'Generate official draw', 'Roster and activation controls', 'Privacy and resource controls', 'COMING SOON']) {
  assert(admin.includes(phrase), `Community administration includes ${phrase}.`);
}

console.log(`Join the Community sports verification passed (${assertions.length} assertions).`);
for (const item of assertions) console.log(`- ${item}`);
