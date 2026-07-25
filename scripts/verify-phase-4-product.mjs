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
const studentSupport = read('src/components/student/StudentChat.tsx');
const splash = read('src/components/shared/SplashScreen.tsx');
const indexHtml = read('index.html');
const manifest = JSON.parse(read('public/manifest.json'));
const packageJson = read('package.json');
const iconGenerator = read('scripts/generate-institutional-app-icon.mjs');
const structureMap = read('public/campus-guides/pretoria-campus-structure-map.svg');
const migration = read('supabase/migrations/20260725103000_student_safety_mobility_and_radar.sql');
const hardening = read('supabase/migrations/20260725104500_student_safety_mobility_campus_scope_hardening.sql');
const mobilityGate = read('scripts/verify-safety-mobility-release.mjs');

check(app.includes('<ApplicationErrorBoundary>'), 'Application retains a recoverable render boundary.');
check(app.includes('<ConnectivityBanner />'), 'Application retains online/offline status guidance.');
for (const route of ['/dashboard', '/security/*', '/admin/*', '/office', '/profile', '/profile-completion', '/judiciary']) {
  check(app.includes(`path="${route}"`), `Primary route ${route} remains registered.`);
}

check(dashboard.includes("label: 'Safety'") && dashboard.includes('<SafetyMobilityHub'), 'Safety Mobility is a first-class student dashboard workflow.');
check(dashboard.includes('useSearchParams') && dashboard.includes("next.set('tab', view)"), 'Student dashboard sections are directly addressable.');
check(dashboard.includes('Open Pilot') && dashboard.includes('StudentDashboardHome'), 'Official-to-Pilot navigation and the campus/residence home remain available.');
check(dashboard.includes('grid-cols-5') && dashboard.includes('<MobileBottomNav'), 'Student navigation remains organised across desktop and mobile.');

for (const marker of ['In-Transit', 'Night Travel', 'Track This Phone', 'Campus Radar', '<CampusMap', 'loadCampusRadar', 'campus_approximate', 'campus_exact']) {
  check(mobilityHub.includes(marker), `Safety Mobility UI includes ${marker}.`);
}
check(mobilityHub.includes('Live location is consent-based and can be stopped at any time.'), 'Mobility UI states the consent and opt-out boundary.');
check(mobilityHub.includes('slice(0, 24)') && mobilityHub.includes('selectedStudent'), 'Radar limits visible profiles and supports tappable student details.');
check(mobilityHub.includes('https://www.google.com/maps/search/?api=1&query='), 'Existing live GPS mapping remains externally linkable.');
check(mobilityHub.includes("navigate('/dashboard?tab=report')"), 'Safety alerts and reports route into the official reporting workflow.');

for (const marker of ['watchPosition', 'clearWatch', 'startSafetySession', 'endSafetySession', 'triggerSafetyAlert', 'setSafetyPresence']) {
  check(mobilityHook.includes(marker) || mobilityService.includes(marker), `Safety Mobility implementation includes ${marker}.`);
}
check(mobilityService.includes("from('safety_mobility_sessions')"), 'Mobility reads persisted official safety sessions.');
for (const rpc of ['safety_start_mobility_session', 'safety_update_mobility_location', 'safety_end_mobility_session', 'safety_trigger_mobility_alert', 'safety_set_student_presence', 'safety_list_campus_radar']) {
  check(mobilityService.includes(`'${rpc}'`), `Safety client invokes secured RPC ${rpc}.`);
}
check(!mobilityService.includes("from('pilot_reports')"), 'Official Safety Mobility does not write into isolated Pilot report records.');

check(reportIncident.includes('MAX_EVIDENCE_FILES = 3'), 'Incident evidence count remains bounded.');
check(reportIncident.includes('MAX_EVIDENCE_BYTES = 10 * 1024 * 1024'), 'Incident evidence file size remains bounded.');
check(reportIncident.includes("{ value: 'Gbv'"), 'The official reporting form retains a dedicated GBV category.');
check(studentSupport.includes('It is not a live chat and does not dispatch emergency services.'), 'Student support states its operational boundary.');

for (const table of ['safety_mobility_sessions', 'safety_mobility_location_updates', 'safety_mobility_events', 'student_safety_presence']) {
  check(migration.includes(`public.${table}`), `Database migration defines ${table}.`);
}
check(migration.toLowerCase().includes('enable row level security') && hardening.includes('safety_require_student_campus'), 'Mobility data is protected by RLS and verified campus scope.');
check(mobilityGate.includes('Radar visibility is explicit and opt-in.') && mobilityGate.includes('Exact radar visibility requires explicit consent.'), 'Dedicated Safety Mobility gate validates privacy controls.');

check(splash.includes('InstitutionBrand') && splash.includes('bg-white') && splash.includes('MY CCSF'), 'Splash screen renders readable institutional CCSF/TUT identity on white.');
check(indexHtml.includes('sizes="180x180" href="/apple-touch-icon.png"'), 'Apple touch icon uses the opaque institutional asset.');
check(indexHtml.includes('sizes="32x32" href="/favicon-32x32.png"'), '32px favicon is explicitly declared.');
check(manifest.icons.some((icon) => icon.src === '/maskable-icon-512.png' && icon.purpose === 'maskable'), 'Manifest includes the padded maskable icon.');
check(manifest.icons.some((icon) => icon.src === '/app-icon-512.png' && icon.purpose === 'any'), 'Manifest includes the opaque standard app icon.');
check(manifest.shortcuts.some((shortcut) => shortcut.url === '/dashboard?tab=safety'), 'Manifest includes a direct Safety Mobility shortcut.');
check(packageJson.includes('generate-institutional-app-icon.mjs'), 'Every build invokes the institutional app-icon generator.');
for (const output of ['app-icon-192.png', 'app-icon-512.png', 'maskable-icon-512.png', 'apple-touch-icon.png', 'favicon-32x32.png', 'favicon-16x16.png']) {
  check(iconGenerator.includes(output), `Icon generator creates ${output}.`);
}
check(structureMap.includes('live GPS map remains separate'), 'Static Pretoria structure reference does not replace the connected live GPS map.');

const protectedFiles = [dashboard, mobilityHub, mobilityHook, mobilityService, reportIncident, studentSupport];
for (const [label, pattern] of [
  ['empty click handler', /onClick=\{\(\) => \{\s*\}\}/],
  ['dead hash link', /href=["']#["']/],
  ['javascript pseudo-link', /javascript:void/],
  ['mock case reference', /Ref#\$\{Math\.floor/],
]) {
  check(!protectedFiles.some((source) => pattern.test(source)), `Student safety workflows contain no ${label}.`);
}

if (failures.length) {
  console.error(`Phase 4 product verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Phase 4 product verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
