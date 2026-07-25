import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const check = (condition, message) => condition ? passes.push(message) : failures.push(message);

const app = read('src/App.tsx');
const dashboard = read('src/pages/Dashboard.tsx');
const mobilityHub = read('src/components/student/SafetyMobilityHub.tsx');
const mobilityHook = read('src/hooks/useSafetyMobility.ts');
const mobilityService = read('src/services/safetyMobilityService.ts');
const reportIncident = read('src/components/student/ReportIncident.tsx');
const support = read('src/components/student/StudentChat.tsx');
const splash = read('src/components/shared/SplashScreen.tsx');
const manifest = JSON.parse(read('public/manifest.json'));
const migration = read('supabase/migrations/20260725103000_student_safety_mobility_and_radar.sql');
const hardening = read('supabase/migrations/20260725104500_student_safety_mobility_campus_scope_hardening.sql');

check(app.includes('<ApplicationErrorBoundary>'), 'Application retains a recoverable render boundary.');
check(app.includes('<ConnectivityBanner />'), 'Application retains connectivity awareness.');
for (const route of ['/dashboard', '/security/*', '/admin/*', '/office', '/profile', '/profile-completion', '/judiciary']) {
  check(app.includes(`path="${route}"`), `Primary route ${route} remains registered.`);
}

for (const label of ['Home', 'My Cases', 'Report', 'Safety', 'Support']) {
  check(dashboard.includes(`label: '${label}'`), `Student dashboard includes ${label}.`);
}
check(dashboard.includes('<SafetyMobilityHub campus={campus} />'), 'Safety Mobility renders inside the official student portal.');
check(dashboard.includes('Open Pilot') && dashboard.includes('StudentDashboardHome'), 'Pilot navigation and the campus/residence home remain available.');
check(dashboard.includes('useSearchParams') && dashboard.includes("next.set('tab', view)"), 'Student destinations support direct links.');
check(dashboard.includes('<MobileBottomNav'), 'Mobile navigation remains available.');

for (const marker of ['In-Transit', 'Night Travel', 'Track This Phone', 'Campus Radar', 'loadCampusRadar', 'selectedStudent', '<CampusMap']) {
  check(mobilityHub.includes(marker), `Safety Mobility UI includes ${marker}.`);
}
check(mobilityHub.includes('Live location is consent-based and can be stopped at any time.'), 'Location sharing states the consent and opt-out boundary.');
check(mobilityHub.includes('campus_approximate') && mobilityHub.includes('campus_exact'), 'Radar supports approximate and explicitly consented exact modes.');
check(mobilityHub.includes('slice(0, 24)'), 'Radar caps the displayed profile set.');
check(mobilityHub.includes('https://www.google.com/maps/search/?api=1&query='), 'Existing live GPS mapping remains linkable.');

check(mobilityHook.includes('watchPosition') && mobilityHook.includes('clearWatch'), 'Live location starts and stops through browser geolocation controls.');
for (const rpc of ['safety_start_mobility_session', 'safety_update_mobility_location', 'safety_end_mobility_session', 'safety_trigger_mobility_alert', 'safety_set_student_presence', 'safety_list_campus_radar']) {
  check(mobilityService.includes(`'${rpc}'`), `Safety client invokes secured RPC ${rpc}.`);
}
check(mobilityService.includes("from('safety_mobility_sessions')"), 'Active safety sessions are persisted.');
check(!mobilityService.includes("from('pilot_reports')"), 'Official Safety Mobility remains separate from Pilot reports.');

for (const table of ['safety_mobility_sessions', 'safety_mobility_location_updates', 'safety_mobility_events', 'student_safety_presence']) {
  check(migration.includes(`public.${table}`), `Migration defines ${table}.`);
}
check(migration.includes('p_confirm_exact') && migration.includes('Exact-location consent is required'), 'Exact Radar visibility requires explicit consent server-side.');
check(migration.includes("last_seen_at > now() - interval '15 minutes'"), 'Stale Radar positions expire automatically.');
check(hardening.includes('safety_require_student_campus'), 'Safety RPCs enforce the verified student campus.');

check(reportIncident.includes('MAX_EVIDENCE_FILES = 3'), 'Incident evidence count is bounded.');
check(reportIncident.includes('MAX_EVIDENCE_BYTES = 10 * 1024 * 1024'), 'Incident evidence size is bounded.');
check(reportIncident.includes("{ value: 'Gbv'"), 'Official reporting retains the GBV category.');
check(support.includes('It is not a live chat and does not dispatch emergency services.'), 'Guided support states its operating boundary.');

check(splash.includes('InstitutionBrand') && splash.includes('bg-white') && splash.includes('MY CCSF'), 'Splash screen presents readable CCSF/TUT branding on white.');
check(manifest.icons.some((icon) => icon.src === '/app-icon-512.png' && icon.purpose === 'any'), 'Manifest uses the opaque standard app icon.');
check(manifest.icons.some((icon) => icon.src === '/maskable-icon-512.png' && icon.purpose === 'maskable'), 'Manifest uses a padded maskable icon.');
check(manifest.shortcuts.some((shortcut) => shortcut.url === '/dashboard?tab=safety'), 'Manifest includes the Safety Mobility shortcut.');

const protectedFiles = [dashboard, mobilityHub, mobilityHook, mobilityService, reportIncident, support];
for (const [label, pattern] of [
  ['empty click handler', /onClick=\{\(\) => \{\s*\}\}/],
  ['dead hash link', /href=["']#["']/],
  ['javascript pseudo-link', /javascript:void/],
]) {
  check(!protectedFiles.some((source) => pattern.test(source)), `Core student workflows contain no ${label}.`);
}

if (failures.length) {
  console.error(`Phase 4 product verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Phase 4 product verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
