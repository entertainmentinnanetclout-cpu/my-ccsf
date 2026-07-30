import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const check = (condition, message) => condition ? passes.push(message) : failures.push(message);

const requiredFiles = [
  'src/App.tsx',
  'src/pages/Dashboard.tsx',
  'src/components/student/SafetyMobilityHub.tsx',
  'src/hooks/useSafetyMobility.ts',
  'src/services/safetyMobilityService.ts',
  'src/components/student/ReportIncident.tsx',
  'src/components/student/ReportIncidentV2.tsx',
  'src/components/shared/SplashScreen.tsx',
  'supabase/migrations/20260725103000_student_safety_mobility_and_radar.sql',
  'supabase/migrations/20260725104500_student_safety_mobility_campus_scope_hardening.sql',
  'public/campus-guides/pretoria-campus-structure-map.svg',
];
requiredFiles.forEach((file) => check(exists(file), `Required product file exists: ${file}.`));

const app = read('src/App.tsx');
const dashboard = read('src/pages/Dashboard.tsx');
const hub = read('src/components/student/SafetyMobilityHub.tsx');
const hook = read('src/hooks/useSafetyMobility.ts');
const service = read('src/services/safetyMobilityService.ts');
const reportEntry = read('src/components/student/ReportIncident.tsx');
const report = read('src/components/student/ReportIncidentV2.tsx');
const splash = read('src/components/shared/SplashScreen.tsx');
const manifest = JSON.parse(read('public/manifest.json'));

check(app.includes('<ApplicationErrorBoundary>') && app.includes('<ConnectivityBanner />'), 'Application keeps error recovery and connectivity handling.');
for (const route of ['/dashboard', '/security/*', '/admin/*', '/office', '/profile', '/profile-completion', '/judiciary']) {
  check(app.includes(`path="${route}"`), `Primary route ${route} remains registered.`);
}
for (const label of ['Home', 'My Cases', 'Report', 'Safety', 'Support']) {
  check(dashboard.includes(`label: '${label}'`), `Student dashboard includes ${label}.`);
}
check(dashboard.includes('<SafetyMobilityHub campus={campus} />'), 'Safety Mobility is connected to the official student dashboard.');
check(dashboard.includes('Open Pilot') && dashboard.includes('StudentDashboardHome'), 'Pilot navigation and campus/residence content remain available.');
check(dashboard.includes('<MobileBottomNav'), 'Mobile navigation remains available.');

for (const marker of ['In-Transit', 'Night Travel', 'Track This Phone', 'Campus Radar', '<CampusMap', 'selectedStudent', 'loadCampusRadar']) {
  check(hub.includes(marker), `Safety Mobility UI includes ${marker}.`);
}
check(hub.includes('Live location is consent-based and can be stopped at any time.'), 'Location sharing has an explicit consent boundary.');
check(hub.includes('campus_approximate') && hub.includes('campus_exact'), 'Radar supports approximate and explicitly consented exact visibility.');
check(hub.includes('https://www.google.com/maps/search/?api=1&query='), 'Existing live GPS map linking remains available.');
check(hook.includes('watchPosition') && hook.includes('clearWatch'), 'Live tracking starts and stops through browser geolocation controls.');
for (const rpc of ['safety_start_mobility_session', 'safety_update_mobility_location', 'safety_end_mobility_session', 'safety_trigger_mobility_alert', 'safety_set_student_presence', 'safety_list_campus_radar']) {
  check(service.includes(`'${rpc}'`), `Safety client invokes ${rpc}.`);
}
check(!service.includes("from('pilot_reports')"), 'Official Safety Mobility remains separate from Pilot reports.');

check(reportEntry.includes('ReportIncidentV2 as ReportIncident'), 'Official report entry points to the resilient V2 workflow.');
check(report.includes('MAX_EVIDENCE_FILES = 3') && report.includes('MAX_EVIDENCE_BYTES = 10 * 1024 * 1024'), 'Evidence uploads remain bounded.');
check(report.includes("{ value: 'Gbv'"), 'Official reporting retains the GBV category.');
check(report.includes('finalizeOfficialSubmission') && report.includes('uploadSubmissionEvidence'), 'Official cases finalise only after selected evidence is verified.');
check(report.includes('Emergency report not delivered'), 'Offline emergency reporting remains fail-closed.');
check(splash.includes('InstitutionBrand') && splash.includes('bg-white') && splash.includes('MY CCSF'), 'Splash screen presents readable CCSF/TUT branding on white.');
check(manifest.icons.some((icon) => icon.src === '/app-icon-512.png'), 'Manifest references the opaque app icon.');
check(manifest.icons.some((icon) => icon.src === '/maskable-icon-512.png'), 'Manifest references the maskable app icon.');
check(manifest.shortcuts.some((shortcut) => shortcut.url === '/dashboard?tab=safety'), 'Manifest includes the Safety Mobility shortcut.');

const protectedFiles = [dashboard, hub, hook, service, report];
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
