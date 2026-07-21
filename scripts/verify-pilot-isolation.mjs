import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function walk(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [relativePath];
  return fs.readdirSync(absolute).flatMap((entry) => walk(path.join(relativePath, entry)));
}

function assert(condition, message) {
  if (condition) passes.push(message);
  else failures.push(message);
}

const browserPilotPaths = [
  'src/config/pilot.ts',
  'src/config/pilotRoutes.ts',
  'src/contexts/PilotModeContext.tsx',
  'src/components/pilot',
  'src/hooks/pilot',
  'src/pages/pilot',
  'src/services/pilot',
];

const edgePilotPaths = [
  'supabase/functions/_shared/pilot',
  ...fs.readdirSync(path.join(root, 'supabase/functions'))
    .filter((name) => name.startsWith('pilot-'))
    .map((name) => `supabase/functions/${name}`),
];

const sourceFiles = [...browserPilotPaths, ...edgePilotPaths]
  .flatMap(walk)
  .filter((file) => /\.(?:ts|tsx|js|mjs)$/.test(file));

assert(sourceFiles.length > 0, 'Pilot source files were discovered.');

const forbiddenProductionPatterns = [
  { name: 'production incidents table', regex: /\.from\(\s*['"]incidents['"]\s*\)/g },
  { name: 'production incident media table', regex: /\.from\(\s*['"]incident_media['"]\s*\)/g },
  { name: 'production incident locations table', regex: /\.from\(\s*['"]incident_location_updates['"]\s*\)/g },
  { name: 'production notifications table', regex: /\.from\(\s*['"]notifications['"]\s*\)/g },
  { name: 'production case updates table', regex: /\.from\(\s*['"]case_updates['"]\s*\)/g },
  { name: 'production escalations table', regex: /\.from\(\s*['"]case_escalations['"]\s*\)/g },
  { name: 'production incident Storage bucket', regex: /['"]incident-media['"]/g },
  { name: 'production push function', regex: /['"]send-push-notification['"]/g },
  { name: 'production location hook', regex: /useLocationTracking/g },
  { name: 'production emergency component', regex: /components\/student\/EmergencyReport/g },
  { name: 'production standard report component', regex: /components\/student\/ReportIncident/g },
];

for (const file of sourceFiles) {
  const content = read(file);
  for (const pattern of forbiddenProductionPatterns) {
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(content)) failures.push(`${file} references ${pattern.name}.`);
  }
}

assert(!failures.some((failure) => failure.includes('references')), 'Pilot browser and Edge source contain no production incident, location, media, case, escalation, push, or reporting references.');

const browserSource = browserPilotPaths.flatMap(walk).filter((file) => /\.(?:ts|tsx)$/.test(file)).map(read).join('\n');
assert(!/service[_-]?role/i.test(browserSource), 'Browser Pilot source contains no service-role credential reference.');
assert(!/pilot-session-cleanup|pilot-cleanup|pilot-export-results/.test(browserSource), 'Browser Pilot source does not call diagnostic-only Edge slugs.');

const config = read('src/config/pilot.ts');
assert(config.includes("VITE_PILOT_MODE_ENABLED === 'true'"), 'Pilot feature activation is fail-closed.');
assert(!config.includes('git-fea-'), 'Pilot activation does not trust broad Preview hostname patterns.');
assert(config.includes('Demo Mode: No emergency service has been dispatched.'), 'Required no-dispatch warning is present.');
assert(config.includes("PILOT_LOCATION_STORAGE_KEY = 'pilot_location_tracking'"), 'Pilot tracking uses a separate browser-storage key.');
assert(config.includes("PILOT_ATTACHMENT_BUCKET = 'pilot-report-attachments'"), 'Pilot attachments use the private Pilot bucket.');
for (const status of ['received', 'assessing', 'assigned', 'in_progress', 'simulation_completed']) {
  assert(config.includes(`'${status}'`), `Pilot status sequence includes ${status}.`);
}

const routeConfig = read('src/config/pilotRoutes.ts');
for (const route of [
  '/pilot/auth',
  '/pilot',
  '/pilot/reviews',
  '/pilot/resources',
  '/security/pilot',
  '/security/pilot/reviews',
  '/admin/pilot',
  '/admin/pilot/reviews',
]) {
  assert(routeConfig.includes(`'${route}'`), `Pilot route contract contains ${route}.`);
}
assert(routeConfig.includes("pathname.startsWith('/pilot/session/')"), 'Pilot session deep links are explicitly recognised.');
assert(routeConfig.includes("pathname.startsWith('/pilot/report/')"), 'Pilot report deep links are explicitly recognised.');
assert(routeConfig.includes('resolvePilotDestination'), 'Role-safe deep-link resolution is centralised.');

const viteConfig = read('vite.config.ts');
assert(viteConfig.includes('feature/ccsf-phases-3-8-release-candidate'), 'Only the approved release-candidate Preview branch auto-enables Pilot Mode.');
assert(viteConfig.includes('vercelEnvironment === "preview"'), 'Automatic Pilot enablement requires a Vercel Preview deployment.');

const app = read('src/App.tsx');
for (const route of [
  '/pilot/auth',
  '/pilot',
  '/pilot/session/:sessionId',
  '/pilot/report/:reportId',
  '/pilot/reviews',
  '/pilot/resources',
  '/security/pilot',
  '/security/pilot/reviews',
  '/admin/pilot',
  '/admin/pilot/reviews',
]) {
  assert(app.includes(`path="${route}"`), `Approved route ${route} is registered.`);
}
assert(app.includes('<PilotEntryIntentBoundary><PilotAuth /></PilotEntryIntentBoundary>'), 'Pilot authentication is rendered inside the dedicated Pilot intent boundary and outside the official application layout.');
assert(app.includes("allowedRoles={['student']}"), 'Student Pilot routes are role guarded.');
assert(app.includes("allowedRoles={['security', 'admin']}"), 'Campus Pilot route is staff guarded.');
assert(app.includes("allowedRoles={['admin']}"), 'Super-admin Pilot route is admin guarded.');

const pilotAuth = read('src/pages/pilot/PilotAuth.tsx');
assert(pilotAuth.includes('signInWithPassword'), 'Pilot authentication reuses existing Supabase accounts.');
assert(pilotAuth.includes('resolvePilotDestination'), 'Pilot authentication redirects by role while preserving approved deep links.');
assert(!pilotAuth.includes('signUp('), 'Pilot authentication does not use an uncontrolled browser sign-up path.');
assert(pilotAuth.includes("'pilot-student-signup'"), 'Pilot student registration uses the controlled server-side signup function.');
assert(pilotAuth.includes('Students may self-register for the active Pilot programme'), 'Pilot authentication explains the controlled student self-registration requirement.');

const protectedRoute = read('src/components/ProtectedRoute.tsx');
assert(protectedRoute.includes("? '/pilot/auth' : '/auth'"), 'Unauthenticated Pilot routes redirect to the dedicated Pilot login.');
assert(protectedRoute.includes('location.search') && protectedRoute.includes('location.hash'), 'Pilot deep-link query and hash state are retained.');

const coreService = read('src/services/pilot/pilotCoreService.ts');
for (const functionSlug of ['pilot-create-session', 'pilot-submit-report']) {
  assert(coreService.includes(`'${functionSlug}'`), `Core service invokes ${functionSlug}.`);
}
assert(coreService.includes("from('pilot_location_events')"), 'Location writes target pilot_location_events.');
assert(coreService.includes("from('pilot_attachments')"), 'Attachment metadata targets pilot_attachments.');
assert(coreService.includes('createSignedUrl'), 'Private attachments use signed URLs.');

const reviewService = read('src/services/pilot/pilotReviewService.ts');
assert(reviewService.includes("'pilot-review-attachments'"), 'Pilot review screenshots use the private review bucket.');
assert(reviewService.includes("rpc('pilot_submit_review'"), 'Student reviews use the server-derived Pilot submission RPC.');
assert(reviewService.includes("rpc('pilot_moderate_review'"), 'Review moderation uses the authorised Pilot RPC.');
assert(!reviewService.includes("from('feedback')"), 'Pilot reviews do not use a production feedback table.');
assert(!reviewService.includes("from('incidents')"), 'Pilot reviews do not use production incidents.');

const experienceService = read('src/services/pilot/pilotExperienceService.ts');
assert(experienceService.includes("'pilot_carousel_slides'") && experienceService.includes("'pilot_resource_documents'"), 'Phase 4 content reads only isolated Pilot carousel and resource tables.');
assert(experienceService.includes("rpc('pilot_get_guide_preferences'") && experienceService.includes("rpc('pilot_update_guide_preferences'"), 'Cross-device guide state uses authenticated Pilot RPCs.');
assert(!experienceService.includes("from('carousel_images')"), 'The Pilot dashboard carousel does not read the production carousel table.');
assert(!experienceService.includes("from('app_settings')"), 'The Pilot experience service does not read production application settings.');

const adminService = read('src/services/pilot/pilotAdminService.ts');
for (const functionSlug of ['pilot-transition-status', 'pilot-create-notification', 'pilot-delete-report']) {
  assert(adminService.includes(`'${functionSlug}'`), `Admin service invokes ${functionSlug}.`);
}
assert(adminService.includes("rpc('pilot_delete_session'"), 'Session deletion uses an authorised Pilot RPC finaliser.');
assert(adminService.includes("rpc('pilot_purge_campus'"), 'Campus purge uses an authorised Pilot RPC finaliser.');
assert(adminService.includes("rpc('pilot_execute_program_cleanup'"), 'Programme cleanup uses a super-admin Pilot RPC finaliser.');
assert(adminService.includes("rpc('pilot_execute_expired_cleanup'"), 'Retention cleanup uses a super-admin Pilot RPC finaliser.');

for (const slug of ['pilot-create-session', 'pilot-submit-report', 'pilot-transition-status', 'pilot-create-notification', 'pilot-delete-report']) {
  const entry = `supabase/functions/${slug}/index.ts`;
  assert(fs.existsSync(path.join(root, entry)), `${slug} source is committed.`);
}

const locationHook = read('src/hooks/pilot/usePilotLocationTracking.ts');
assert(locationHook.includes('PILOT_LOCATION_STORAGE_KEY'), 'Pilot location hook uses the Pilot-only tracking key.');
assert(locationHook.includes("source: 'initial_fix' | 'live_tracking' | 'manual_pin' | 'resumed_tracking'"), 'Pilot location sources are explicitly constrained.');
assert(locationHook.includes('clearWatch'), 'Pilot location tracking clears browser watches.');
assert(locationHook.includes('localStorage.removeItem(PILOT_LOCATION_STORAGE_KEY)'), 'Stopping Pilot tracking clears persisted tracking state.');

const resources = read('src/pages/pilot/PilotResources.tsx');
assert(resources.includes("recordDownload('safety_resource_print_pdf')"), 'Printing the interactive Safety Guide is recorded as a Pilot feature test.');
assert(resources.includes("recordDownload('safety_guide_pdf_download')"), 'Downloading the versioned Safety Guide PDF is recorded as a Pilot feature test.');
assert(resources.includes('window.print()'), 'Printable Pilot resources use the browser print/PDF workflow.');
assert(resources.includes('sm:flex-row') && resources.includes('flex-wrap'), 'Pilot resources expose responsive mobile and desktop controls.');
assert(resources.includes('Reset Guide Across Devices'), 'Students can reset their profile-bound guide preference from Safety Guide.');

const indexHtml = read('index.html');
assert(indexHtml.includes('width=device-width, initial-scale=1.0'), 'Application viewport metadata supports mobile rendering.');

const vercel = read('vercel.json');
assert(vercel.includes('"destination": "/index.html"'), 'Vercel rewrites direct Pilot deep links to the SPA entry point.');

if (failures.length) {
  console.error(`Pilot isolation verification failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Pilot isolation verification passed (${passes.length} assertions).`);
for (const pass of passes) console.log(`- ${pass}`);
