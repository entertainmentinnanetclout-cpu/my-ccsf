import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const requireText = (source, expected, label) => {
  if (!source.includes(expected)) throw new Error(`Phase 1 verification failed: ${label}`);
};
const forbidText = (source, forbidden, label) => {
  if (source.includes(forbidden)) throw new Error(`Phase 1 verification failed: ${label}`);
};

const app = read('src/App.tsx');
const intent = read('src/lib/pilotIntent.ts');
const boundary = read('src/components/pilot/PilotIntentBoundary.tsx');
const postProfile = read('src/components/pilot/PilotPostProfileRedirect.tsx');
const layout = read('src/components/pilot/PilotInstitutionalLayout.tsx');
const navigation = read('src/components/pilot/PilotStudentNavigation.tsx');
const guard = read('src/components/pilot/PilotRouteGuard.tsx');
const pilotAuth = read('src/pages/pilot/PilotAuth.tsx');
const edgeService = read('src/services/pilot/pilotEdgeService.ts');
const supabaseConfig = read('supabase/config.toml');
const migration = read('supabase/migrations/20260720173000_phase_1_pilot_signup_profile_ready.sql');

requireText(app, '<PilotEntryIntentBoundary><PilotAuth /></PilotEntryIntentBoundary>', 'Pilot auth route must persist Pilot intent.');
requireText(app, '<OfficialEntryIntentBoundary><Auth /></OfficialEntryIntentBoundary>', 'Official auth route must clear stale Pilot intent.');
requireText(app, '<PilotPostProfileRedirect><ProfileCompletion /></PilotPostProfileRedirect>', 'Profile completion must preserve Pilot return routing.');
requireText(intent, "const PILOT_INTENT_KEY = 'ccsf_pilot_intent'", 'Pilot intent must persist across refreshes.');
requireText(boundary, 'markPilotIntent(requestedPath(from))', 'Pilot entry must store the requested Pilot destination.');
requireText(postProfile, 'hasPilotIntent()', 'Dashboard fallback must recover persistent Pilot intent.');
requireText(layout, '<PilotStudentNavigation />', 'Every student Pilot page must expose Pilot navigation.');
requireText(layout, 'navigate(PILOT_ROUTES.auth, { replace: true })', 'Pilot logout must return to Pilot sign in.');
requireText(navigation, "label: 'Pilot Dashboard'", 'Student navigation must include the Pilot dashboard.');
requireText(navigation, "label: 'Safety Guide'", 'Student navigation must include safety resources.');
requireText(navigation, "label: 'Reviews'", 'Student navigation must include Pilot reviews.');
requireText(guard, 'Retry Pilot enrolment', 'Pilot enrolment failures must remain recoverable inside Pilot.');
forbidText(guard, "navigate('/dashboard')", 'Pilot guard must not send students into the official dashboard.');
requireText(pilotAuth, 'resolvePilotDestination(userRole, requestedFrom)', 'Pilot auth must resolve role-specific Pilot destinations.');
requireText(pilotAuth, "invokePublicPilotFunction<{ created: boolean }>('pilot-student-signup'", 'Pilot self-registration must use the unauthenticated function path.');
forbidText(pilotAuth, "invokePilotFunction<{ created: boolean }>('pilot-student-signup'", 'Pilot signup must never require an existing authenticated session.');
requireText(edgeService, 'export async function invokePublicPilotFunction', 'A dedicated public Pilot function helper must exist.');
const publicHelper = edgeService.slice(
  edgeService.indexOf('export async function invokePublicPilotFunction'),
  edgeService.indexOf('export async function invokePilotFunction'),
);
forbidText(publicHelper, 'ensureFreshAuthSession', 'Public Pilot functions must not refresh a session before account creation.');
requireText(supabaseConfig, '[functions.pilot-student-signup]\nverify_jwt = false', 'Pilot signup must remain deployed as the intentionally public, internally protected function.');
requireText(migration, "raw_user_meta_data ->> 'pilot_signup'", 'Pilot-created profiles must be identified server-side.');
requireText(migration, 'new.profile_completed := true', 'Pilot-created profiles must be routing-ready.');

console.log('Phase 1 Pilot authentication and navigation verification passed.');
