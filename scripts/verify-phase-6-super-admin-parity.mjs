import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const assert = (condition, message) => condition ? passes.push(message) : failures.push(message);

const dashboard = read('src/components/pilot/PilotSuperAdminDashboard.tsx');
const page = read('src/pages/pilot/SuperAdminPilotPage.tsx');
const app = read('src/App.tsx');

assert(page.includes('<PilotSuperAdminDashboard />'), 'Super-admin route uses the dedicated Phase 6 dashboard.');
assert(!page.includes('PilotLiveAdminWorkspace') && !page.includes('PilotAdminWorkspace'), 'Super-admin route no longer uses the generic administration workspace.');

for (const label of ['Overview', 'Operations', 'Campuses', 'Programmes', 'Students', 'Analytics', 'Governance', 'Audit']) {
  assert(dashboard.includes(`label: '${label}'`), `Super-admin Pilot includes ${label} navigation.`);
}

assert(dashboard.includes('loadPilotAdminData({ programId })'), 'Super-admin Pilot loads programme-filtered cross-campus data without campus restriction.');
for (const table of ['pilot_programs', 'pilot_scenarios', 'pilot_participants', 'pilot_sessions', 'pilot_reports', 'pilot_report_events', 'pilot_notifications', 'pilot_feedback', 'pilot_feature_tests', 'pilot_audit_logs']) {
  assert(dashboard.includes(`'${table}'`), `Super-admin Realtime includes ${table}.`);
}
assert(dashboard.includes('PILOT_CAMPUS_VALUES.map'), 'Super-admin Pilot provides all-campus operational summaries.');
assert(dashboard.includes('campusFilter') && dashboard.includes('statusFilter') && dashboard.includes('filteredReports'), 'Cross-campus operations support campus, status and search filtering.');
assert(dashboard.includes("received: 'assessing'") && dashboard.includes("assigned: 'in_progress'") && dashboard.includes("in_progress: 'simulation_completed'"), 'Super-admin Pilot supports the controlled report lifecycle.');
assert(dashboard.includes("transitionPilotReport(report.id, 'assigned'") && dashboard.includes('userProfile.id'), 'Super-admin can accept controlled triage ownership without raw UUID prompts.');
assert(dashboard.includes('addPilotReportNote') && dashboard.includes('createPilotNotification'), 'Super-admin Pilot supports timeline notes and student updates.');

assert(dashboard.includes('<PilotConfigurationPanel') && dashboard.includes("setProgramStatus('active')") && dashboard.includes("setProgramStatus('paused')") && dashboard.includes("setProgramStatus('completed')") && dashboard.includes("setProgramStatus('archived')"), 'Programme configuration and lifecycle controls are present.');
assert(dashboard.includes('searchPilotStudentProfiles') && dashboard.includes('invitePilotParticipant') && dashboard.includes('updatePilotParticipant'), 'Student search, invitation and controlled removal are present.');
assert(dashboard.includes('requestPilotExport') && dashboard.includes('PilotCsvExportPanel'), 'De-identified, identified and CSV export workflows are present.');
assert(dashboard.includes('requestPilotRetentionPlan') && dashboard.includes('requestPilotProgramPurge'), 'Retention and programme-exit governance controls are present.');
assert(dashboard.includes('CLEAN EXPIRED') && dashboard.includes("['completed', 'archived'].includes(selectedProgram.status)"), 'Destructive governance actions require explicit confirmation and completed/archived programme state.');
assert(dashboard.includes('data.auditLogs') && dashboard.includes('auditSearch') && dashboard.includes('Affected records:'), 'Cross-campus audit search and structured audit details are present.');
assert(dashboard.includes('No production case or emergency dispatch is used.'), 'Super-admin Pilot permanently states the no-production/no-dispatch boundary.');
assert(dashboard.includes('data-testid="ready-pilot-super-admin-parity"'), 'Super-admin Pilot has a stable readiness marker.');
assert(dashboard.includes('role="tablist"') && dashboard.includes('aria-selected='), 'Super-admin navigation exposes accessible tab semantics.');

for (const prohibited of [
  "from('incidents')", "from('notifications')", "from('case_updates')", "from('admin_logs')",
  '<AdminOverview', '<AdminIncidents', '<CaseEscalation', '<IncidentAnalytics', '<AdminAnnouncements',
  '<StaffCommunication', '<CarouselManager', '<CampusAdminManager', '<WifiAccessPointManager', '<OfficeView',
  'window.prompt', 'window.confirm', '<pre', 'pilot-session-cleanup', 'pilot-cleanup', 'pilot-export-results',
]) {
  assert(!dashboard.includes(prohibited), `Super-admin Pilot excludes production or diagnostic workflow: ${prohibited}.`);
}

assert(app.includes('path="/admin/pilot"') && app.includes('<SuperAdminPilotPage />'), 'The protected super-admin Pilot route remains registered.');

if (failures.length) {
  console.error(`Phase 6 super-admin parity verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Phase 6 super-admin parity verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
