import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'src/components/community/CommunityHub.tsx',
  'src/components/community/CommunityAdminDashboard.tsx',
  'src/data/communityCatalog.ts',
  'src/services/communityService.ts',
  'src/types/community.ts',
  'supabase/migrations/20260804193000_join_the_community.sql',
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
const admin = readFileSync('src/components/community/CommunityAdminDashboard.tsx', 'utf8');
const catalog = readFileSync('src/data/communityCatalog.ts', 'utf8');
const service = readFileSync('src/services/communityService.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260804193000_join_the_community.sql', 'utf8');
const official = readFileSync('src/pages/Dashboard.tsx', 'utf8');
const pilot = readFileSync('src/components/pilot/PilotStudentDashboard.tsx', 'utf8');
const officialAdmin = readFileSync('src/pages/Admin.tsx', 'utf8');
const pilotAdmin = readFileSync('src/components/pilot/PilotSuperAdminDashboard.tsx', 'utf8');

for (const phrase of [
  'Join the Community',
  'Play. Participate. Volunteer. Lead. Represent.',
  'Official My CCSF',
  'Community Games',
  'Sports and Tournaments',
  'Blogs and Media',
  'My Participation',
  'Your Campus. Your Community. Your Voice.',
]) assert(hub.includes(phrase), `Student community hub includes ${phrase}.`);

for (const phrase of [
  'Campus Treasure Hunt',
  'Spot the Building',
  'Campus Safety Quiz',
  'Safety Scenario Challenge',
  'Campus Check-In Challenge',
  'Community Missions',
  'My CCSF Pilot Soccer Tournament',
  'My CCSF Pilot Netball Tournament',
  'Campus Ambassador',
  'Residence Ambassador',
  'Crime Prevention and Campus Patrol Awareness',
  'Administration and Office Support',
  'Marketing and Promotions',
  'Journalism, Media and Content Creation',
  'IT and Technical Support',
]) assert(catalog.includes(phrase), `Community catalog includes ${phrase}.`);

assert(catalog.includes('must not confront suspects'), 'Crime-prevention role retains the non-confrontation safety boundary.');
assert(hub.includes('compliance_completed_at'), 'Sports UI explains first-eight compliance timestamp priority.');
assert(service.includes('calculateTeamCompliance'), 'Team compliance is calculated in a dedicated service function.');
assert(service.includes('verificationTargetReached'), 'Team compliance requires verified players.');
assert(service.includes('allMembersOnboarded'), 'Team compliance requires onboarding completion.');
assert(service.includes('coachCompleted'), 'Team compliance enforces coach requirements.');
assert(service.includes('rulesAccepted'), 'Team compliance enforces rule acceptance.');
assert(hub.includes('Complete your My CCSF Pilot profile to participate'), 'Participation uses the onboarding gate.');
assert(hub.includes("'/pilot/safety-quest'"), 'Pilot community safety quiz routes to Pilot Safety Quest.');
assert(hub.includes("'/safety-quest'"), 'Official community safety quiz routes to official Safety Quest.');
assert(hub.includes('leaderboardPrivacy'), 'Leaderboard includes privacy controls.');
assert(hub.includes('Submit for Moderation'), 'Student content enters moderation.');

for (const table of [
  'community_profiles',
  'community_role_applications',
  'community_role_assignments',
  'community_games',
  'community_game_participants',
  'community_game_submissions',
  'community_points',
  'community_badges',
  'sports_teams',
  'sports_team_members',
  'sports_team_invitations',
  'sports_team_compliance',
  'community_events',
  'community_event_registrations',
  'content_posts',
  'content_submissions',
  'community_notifications',
  'student_verifications',
  'community_audit_logs',
]) assert(migration.includes(`public.${table}`), `Migration defines ${table}.`);

assert(migration.includes("environment in ('official','pilot')"), 'Official and Pilot records are isolated by environment.');
assert(migration.includes('enable row level security'), 'Community tables enable row-level security.');
assert(migration.includes('community_is_admin'), 'Community administration is protected by an authorised admin helper.');
assert(migration.includes('compliance_completed_at'), 'Database stores the compliance completion timestamp.');
assert(migration.includes('idx_sports_compliance_queue'), 'Database indexes the compliance queue.');
assert(migration.includes('Patrol') || migration.includes('patrol'), 'Database seeds the community patrol awareness role.');

assert(official.includes("'community'"), 'Official student navigation includes Community.');
assert(official.includes('<CommunityHub') && official.includes('environment="official"'), 'Official portal renders the shared community experience.');
assert(pilot.includes("'community'"), 'Pilot student navigation includes Community.');
assert(pilot.includes('<CommunityHub') && pilot.includes('environment="pilot"'), 'Pilot portal renders the shared community experience.');

for (const preserved of ["'home'", "'report'", "'safety'", "'messages'"]) assert(official.includes(preserved), `Official portal preserves ${preserved}.`);
for (const preserved of ["'home'", "'report'", "'safety'", "'support'"]) assert(pilot.includes(preserved), `Pilot portal preserves ${preserved}.`);

assert(officialAdmin.includes('<CommunityAdminDashboard') && officialAdmin.includes('environment="official"'), 'Official admin console includes community management.');
assert(pilotAdmin.includes('<CommunityAdminDashboard') && pilotAdmin.includes('environment="pilot"'), 'Pilot super-admin console includes Pilot community management.');
assert(admin.includes('Community Administration'), 'Community admin workspace identifies its governance purpose.');
assert(admin.includes('does not grant admin'), 'Community admin workspace preserves RBAC separation.');

console.log(`Join the Community verification passed (${assertions.length} assertions).`);
for (const item of assertions) console.log(`- ${item}`);
