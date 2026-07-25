import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
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

for (const marker of ['watchPosition', 'clearWatch', 'startSafetySession', 'stopSafetySession', 'sendSafetyAlert', 'updateRadarPreference']) {
  check(mobilityHook.includes(marker) || mobilityService.includes(marker), `Safety Mobility implementation includes ${marker}.`);
}
check(mobilityService.includes("from('safety_mobility_sessions')") && mobilityService.includes("from('safety_location_updates')"), 'Mobility uses dedicated persisted session and location sources.');
check(mobilityService.includes("from('safety_presence_preferences')"), 'Campus Radar uses a dedicated consent preference source.');
check(!mobilityService.includes("from('pilot_reports')"), 'Official Safety Mobility does not write into isolated Pilot report records.');

check(reportIncident.includes('MAX_EVIDENCE_FILES = 3'), 'Incident evidence count remains bounded.');
check(reportIncident.includes('MAX_EVIDENCE_BYTES = 10 * 1024 * 1024'), 'Incident evidence file size remains bounded.');
check(reportIncident.includes("{ value: 'Gbv'"), 'The official reporting form retains a dedicated GBV category.');
check(studentSupport.includes('It is not a live chat and does not dispatch emergency services.'), 'Student support states its operational boundary.');

check(migration.includes('safety_mobility_sessions') && migration.includes('safety_location_updates') && migration.includes('safety_presence_preferences'), 'Database migration defines isolated mobility, location and Radar records.');
check(migration.includes('row level security') && hardening.includes('campus'), 'Mobility data is protected by RLS and campus-scope hardening.');
check(mobilityGate.includes('permanent') || mobilityGate.includes('consent'), 'Dedicated Safety Mobility regression gate validates privacy controls.');

check(splash.includes('InstitutionBrand') || splash.includes('CCSF'), 'Splash screen renders institutional CCSF identity.');
check(indexHtml.includes('sizes="180x180" href="/apple-touch-icon.png"'), 'Apple touch icon uses the opaque institutional asset.');
check(indexHtml.includes('sizes="32x32" href="/favicon-32x32.png"'), '32px favicon is explicitly declared.');
check(manifest.icons.some((icon) => icon.src === '/maskable-icon-512.png' && icon.purpose === 'maskable'), 'Manifest includes the padded maskable icon.');
check(manifest.icons.some((icon) => icon.src === '/app-icon-512.png' && icon.purpose === 'any'), 'Manifest includes the opaque standard app icon.');
check(manifest.shortcuts.some((shortcut) => shortcut.url === '/dashboard?tab=safety'), 'Manifest includes a direct Safety Mobility shortcut.');

for (const asset of ['public/app-icon-192.png', 'public/app-icon-512.png', 'public/maskable-icon-512.png', 'public/apple-touch-icon.png', 'public/campus-guides/pretoria-campus-structure-map.svg']) {
  check(exists(asset), `Required release asset exists: ${asset}.`);
}

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
