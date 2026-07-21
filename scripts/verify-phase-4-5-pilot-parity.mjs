import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const assert = (condition, message) => condition ? passes.push(message) : failures.push(message);

const student = read('src/components/pilot/PilotStudentDashboard.tsx');
const campus = read('src/components/pilot/PilotCampusSecurityDashboard.tsx');
const campusPage = read('src/pages/pilot/CampusPilotPage.tsx');
const app = read('src/App.tsx');

for (const label of ['Home', 'My Cases', 'Report', 'Map', 'Support']) {
  assert(student.includes(`label: '${label}'`), `Student Pilot includes official ${label} navigation.`);
}
assert(
  student.includes('<PilotDashboardCarousel')
    && student.includes('<StudentDashboardHome campus={participant.campus} showCarousel={false} />'),
  'Student Pilot uses the isolated Phase 4 carousel while retaining shared welcome and news content.',
);
assert(student.includes('loadOwnPilotReports') && student.includes('loadPilotScenarios') && student.includes('loadPilotNotifications'), 'Student Pilot loads isolated cases, workflows and notifications.');
assert(
  student.includes('Emergency Test')
    && student.includes('openEmergencySimulation')
    && student.includes("scenario_type === 'emergency_simulation'"),
  'Student Pilot exposes an always-available controlled emergency test.',
);
assert(student.includes('<PilotReportForm') && student.includes('requires_location'), 'Student Pilot retains isolated report, evidence and location workflows.');
assert(student.includes('This Pilot does not dispatch external emergency services.'), 'Student support states its no-dispatch boundary.');
assert(student.includes('setNotifications(previous)'), 'Student notification updates roll back after backend failure.');
assert(student.includes('role="tablist"') && student.includes('aria-selected='), 'Student Pilot navigation exposes accessible tab semantics.');
assert(student.includes('role="log"') && student.includes('aria-live="polite"'), 'Student Pilot notifications are announced accessibly.');
assert(student.includes('data-testid="ready-pilot-student-dashboard"'), 'Student Pilot has a stable readiness marker.');
assert(student.includes('usePilotGuide({ autoOpen: true })'), 'Student Pilot includes the Phase 4 first-login guide.');
assert(student.includes('Download the CCSF Pilot Safety Guide'), 'Student Pilot exposes the Phase 4 safety handbook.');

for (const prohibited of ["from('incidents')", "from('notifications')", "from('case_updates')", "from('incident_media')", 'send-push-notification', '<EmergencyReport', '<ReportIncident']) {
  assert(!student.includes(prohibited), `Student Pilot does not reference production workflow: ${prohibited}.`);
}

for (const label of ['Overview', 'Incidents', 'Analytics', 'Students', 'Updates', 'Comms']) {
  assert(campus.includes(`label: '${label}'`), `Campus-security Pilot includes ${label} navigation.`);
}
assert(campus.includes('loadPilotAdminData({ programId, campus })'), 'Campus-security Pilot loads data with explicit campus scope.');
for (const table of ['pilot_reports', 'pilot_report_events', 'pilot_notifications', 'pilot_participants', 'pilot_sessions', 'pilot_feature_tests']) {
  assert(campus.includes(`'${table}'`), `Campus-security Realtime includes ${table}.`);
}
assert(campus.includes("received: 'assessing'") && campus.includes("assigned: 'in_progress'") && campus.includes("in_progress: 'simulation_completed'"), 'Campus-security Pilot implements the controlled case lifecycle.');
assert(campus.includes("actionMode === 'assign'") && campus.includes("transitionPilotReport(actionReport.id, 'assigned'") && campus.includes('userProfile.id'), 'Campus-security assignment uses the authenticated staff profile.');
assert(campus.includes('Assign to me') && campus.includes('No profile UUID is required.'), 'Campus-security assignment presents an institutional accept-case workflow instead of raw identifiers.');
assert(!campus.includes('Campus officer profile UUID') && !campus.includes('00000000-0000-0000-0000-000000000000'), 'Campus-security workflow exposes no raw UUID assignment control.');
assert(campus.includes('addPilotReportNote') && campus.includes('createPilotNotification'), 'Campus-security Pilot supports timeline communication and student notifications.');
assert(campus.includes('calculatePilotMetrics') && campus.includes('groupTests(data)'), 'Campus-security Pilot provides campus analytics.');
assert(campus.includes('No production case is read, written or dispatched.'), 'Campus-security Pilot states production isolation.');
assert(campus.includes('data-testid="ready-pilot-campus-parity"'), 'Campus-security Pilot has a stable readiness marker.');
assert(campusPage.includes('<PilotCampusSecurityDashboard campus={campus} />'), 'Campus Pilot route uses the dedicated parity dashboard.');
assert(campusPage.includes('Campus assignment required'), 'Campus Pilot fails closed when campus scope is missing.');

for (const prohibited of ["from('incidents')", "from('notifications')", "from('case_updates')", "from('profiles')", '<AdminIncidents', '<ResolveCases', '<StaffCommunication', '<CampusAnalytics', '<AdminAnnouncements', '<WifiAccessPointManager']) {
  assert(!campus.includes(prohibited), `Campus-security Pilot does not reuse production workflow: ${prohibited}.`);
}

assert(app.includes('path="/pilot"') && app.includes('path="/security/pilot"'), 'Student and campus-security Pilot routes remain registered.');

if (failures.length) {
  console.error(`Phase 4/5 Pilot parity verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Phase 4/5 Pilot parity verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
