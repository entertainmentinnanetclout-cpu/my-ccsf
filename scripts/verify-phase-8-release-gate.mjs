import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const parseJson = (relativePath) => JSON.parse(read(relativePath));
const assert = (condition, message) => condition ? passes.push(message) : failures.push(message);

const core = read('src/services/pilot/pilotCoreService.ts');
const adminService = read('src/services/pilot/pilotAdminService.ts');
const reportForm = read('src/components/pilot/PilotReportForm.tsx');
const student = read('src/components/pilot/PilotStudentDashboard.tsx');
const campus = read('src/components/pilot/PilotCampusSecurityDashboard.tsx');
const superAdmin = read('src/components/pilot/PilotSuperAdminDashboard.tsx');
const pilotConfig = read('src/config/pilot.ts');
const app = read('src/App.tsx');
const institutionBrand = read('src/components/shared/InstitutionBrand.tsx');
const mobileNav = read('src/components/shared/MobileBottomNav.tsx');
const splash = read('src/components/shared/SplashScreen.tsx');
const serviceWorker = read('public/sw.js');
const manifest = parseJson('public/manifest.json');
const migration = read('supabase/migrations/20260719211500_phase_8_authenticated_assignment_parity.sql');
const completion = read('docs/PHASE_8_COMPLETE.md');
const evidence = read('docs/PHASE_8_UAT_EVIDENCE.md');
const rollback = read('docs/PHASE_8_ROLLBACK_PACKAGE.md');

// Student-to-staff lifecycle and feature parity.
assert(core.includes("invokePilotEdge<{ session: PilotSession }>('pilot-create-session'"), 'Student Pilot session creation uses the JWT-protected Pilot service.');
assert(core.includes("invokePilotEdge<{ report: PilotReport }>('pilot-submit-report'"), 'Student report submission uses the isolated Pilot service.');
for (const field of ['location_lat', 'location_lng', 'location_accuracy', 'location_description']) {
  assert(core.includes(field), `Student report service preserves ${field}.`);
}
assert(core.includes("from('pilot_location_events')") && reportForm.includes("source: 'initial_fix'"), 'Initial Pilot location events are persisted in the isolated location table.');
assert(reportForm.includes('enableHighAccuracy: true') && reportForm.includes('maximumAge: 0'), 'Location capture requests a fresh high-accuracy fix.');
assert(reportForm.includes('scenario.requires_live_tracking') && student.includes('Live Pilot tracking'), 'Live-location scenarios and tracking controls remain available.');
assert(reportForm.includes('uploadPilotAttachments') && reportForm.includes("featureKey: 'attachment_upload'"), 'Evidence uploads record success and failure telemetry.');
assert(core.includes('PILOT_MAX_ATTACHMENTS') && core.includes('PILOT_MAX_FILE_BYTES') && core.includes('PILOT_ALLOWED_MIME_TYPES'), 'Evidence validation enforces count, size and MIME constraints.');
assert(core.includes("from(PILOT_ATTACHMENT_BUCKET)") && core.includes('createSignedUrl'), 'Evidence remains in the private Pilot bucket and is read through signed URLs.');
assert(reportForm.includes('I understand this is a simulation') && reportForm.includes('will not contact CPS, SAPS, an ambulance, security personnel or any emergency service'), 'Emergency simulation requires explicit no-dispatch confirmation.');
assert(reportForm.includes('No emergency service was dispatched.'), 'Student completion messaging states the no-dispatch boundary.');

// Realtime, notification and audit behavior.
assert(core.includes("supabase.channel(`pilot-report-${reportId}`)") && core.includes("table: 'pilot_reports'") && core.includes("table: 'pilot_report_events'"), 'Student case tracking subscribes to report and timeline Realtime sources.');
assert(core.includes("supabase.channel(`pilot-notifications-${userId}`)") && core.includes("table: 'pilot_notifications'"), 'Student notification tracking subscribes to isolated Realtime notifications.');
assert(core.includes("rpc('pilot_mark_notification_read'"), 'Notification read receipts use the owner-authorised RPC.');
assert(campus.includes("['pilot_reports', 'pilot_report_events', 'pilot_notifications', 'pilot_participants', 'pilot_sessions', 'pilot_feature_tests']"), 'Campus-security Realtime covers queues, sessions, participants and telemetry.');
assert(superAdmin.includes("['pilot_programs', 'pilot_scenarios', 'pilot_participants', 'pilot_sessions', 'pilot_reports', 'pilot_report_events', 'pilot_notifications', 'pilot_feedback', 'pilot_feature_tests', 'pilot_audit_logs']"), 'Super-admin Realtime covers the full Pilot governance register.');

// Campus and super-admin exact workflow match.
for (const label of ['Overview', 'Incidents', 'Analytics', 'Students', 'Updates', 'Comms']) {
  assert(campus.includes(`label: '${label}'`), `Campus portal retains ${label}.`);
}
assert(campus.includes("received: 'assessing'") && campus.includes("assigned: 'in_progress'") && campus.includes("in_progress: 'simulation_completed'"), 'Campus portal exposes the complete controlled lifecycle.');
assert(campus.includes("transitionPilotReport(actionReport.id, 'assigned'") && campus.includes('userProfile.id'), 'Campus assignment uses the authenticated staff identity.');
assert(campus.includes('Assign to me') && campus.includes('No profile UUID is required.'), 'Campus assignment matches an institutional accept-case workflow.');
assert(!campus.includes('Campus officer profile UUID') && !campus.includes('00000000-0000-0000-0000-000000000000'), 'Campus portal exposes no raw assignment identifiers.');
assert(campus.includes('addPilotReportNote') && campus.includes('createPilotNotification'), 'Campus staff can add timeline notes and student updates.');
for (const label of ['Overview', 'Operations', 'Campuses', 'Programmes', 'Participants', 'Analytics', 'Governance', 'Audit']) {
  assert(superAdmin.includes(`label: '${label}'`), `Super-admin portal retains ${label}.`);
}
assert(superAdmin.includes('requestPilotExport') && superAdmin.includes('PilotCsvExportPanel'), 'Super-admin retains identified, de-identified and CSV exports.');
assert(superAdmin.includes('requestPilotRetentionPlan') && superAdmin.includes('requestPilotProgramPurge'), 'Super-admin retains governed retention and programme exit.');
assert(adminService.includes("rpc('pilot_add_report_note'") && adminService.includes("rpc('pilot_export_data'"), 'Staff notes and exports remain governed by Pilot RPCs.');

// Database assignment parity correction.
assert(migration.includes('create or replace function pilot_private.transition_report'), 'Phase 8 migration replaces only the Pilot transition function.');
assert(migration.includes("private.raw_has_role(p_assigned_to, 'security'::public.user_role)"), 'Migration permits verified campus-security assignees.');
assert(migration.includes("private.raw_has_role(p_assigned_to, 'admin'::public.user_role)"), 'Migration recognises acting super-admin ownership.');
assert(migration.includes("p_assigned_to <> v_actor"), 'Super-admin assignment is restricted to the acting authenticated admin.');
assert(migration.includes("private.raw_get_user_campus(p_assigned_to) <> v_row.campus"), 'Security assignment remains campus-bound.');
assert(migration.includes('No emergency service has been dispatched.'), 'Lifecycle notifications retain the no-dispatch statement.');
for (const productionToken of ['public.incidents', 'public.notifications', 'public.case_updates', 'send-push-notification']) {
  assert(!migration.includes(productionToken), `Phase 8 migration does not touch production workflow: ${productionToken}.`);
}

// Isolation and route ownership.
for (const route of ['/pilot', '/pilot/session/:sessionId', '/pilot/report/:reportId', '/security/pilot', '/admin/pilot']) {
  assert(app.includes(`path="${route}"`), `Release candidate registers ${route}.`);
}
for (const source of [core, adminService, reportForm, student, campus, superAdmin]) {
  for (const prohibited of ["from('incidents')", "from('notifications')", "from('case_updates')", "from('incident_media')", 'send-push-notification']) {
    assert(!source.includes(prohibited), `Active Pilot source excludes production workflow token: ${prohibited}.`);
  }
}
assert(pilotConfig.includes('No external emergency service or production dispatch workflow is contacted.'), 'Canonical Pilot warning preserves operational isolation.');
assert(student.includes('data-testid="ready-pilot-student-dashboard"') && campus.includes('data-testid="ready-pilot-campus-parity"') && superAdmin.includes('data-testid="ready-pilot-super-admin-parity"'), 'All three role portals expose stable readiness markers.');

// Accessibility, responsive behavior, dark mode and PWA match.
assert(student.includes('role="tablist"') && campus.includes('role="tablist"') && superAdmin.includes('role="tablist"'), 'Role portal navigation exposes tab semantics.');
assert(student.includes('aria-selected=') && campus.includes('aria-selected=') && superAdmin.includes('aria-selected='), 'Role portal tabs expose selected state.');
assert(mobileNav.includes('overflow-x-auto') && !mobileNav.includes('slice(0'), 'Mobile navigation retains every portal section.');
assert(mobileNav.includes('pb-[env(safe-area-inset-bottom)]') && mobileNav.includes('aria-current='), 'Mobile navigation supports device safe areas and current-page semantics.');
assert(institutionBrand.includes('getTutLogo(activeTheme)') && institutionBrand.includes('BRAND.assets.ccsfLogo'), 'Canonical CCSF and separate theme-aware TUT assets remain paired.');
assert(splash.includes('useReducedMotion') && splash.includes('<InstitutionBrand size="splash"'), 'Startup behavior respects reduced motion and institutional hierarchy.');
assert(manifest.theme_color === '#002F6C' && manifest.background_color === '#002F6C' && manifest.lang === 'en-ZA', 'PWA manifest retains institutional navy and South African locale.');
assert(manifest.icons.some((icon) => icon.purpose === 'maskable') && manifest.shortcuts.some((shortcut) => shortcut.url === '/dashboard?tab=report'), 'PWA retains maskable identity and official report shortcut.');
assert(serviceWorker.includes("const CACHE_VERSION = 'phase7-2026-07-19-v4'") && serviceWorker.includes("event.data?.type === 'SKIP_WAITING'"), 'PWA retains controlled cache replacement and update activation.');

// Evidence, rollback and explicit approval gate.
for (const phrase of ['Student → campus-security → super-admin lifecycle', 'Cross-role and cross-campus authorisation', 'Production isolation', 'Post-test residue verification']) {
  assert(evidence.includes(phrase), `UAT evidence records ${phrase}.`);
}
assert(evidence.includes('zero UAT Pilot sessions') && evidence.includes('participant status restored to `invited`'), 'UAT evidence records complete rollback residue verification.');
assert(rollback.includes('READY FOR EXPLICIT APPROVAL') && rollback.includes('Approval to merge is not automatically approval to publish'), 'Rollback package requires separate explicit release decisions.');
assert(rollback.includes('Phase 7 release-candidate head before Phase 8') && rollback.includes('VITE_PILOT_MODE_ENABLED=false'), 'Rollback package defines Git and production Pilot recovery points.');
assert(rollback.includes('Never delete or edit an already-applied migration') && rollback.includes('Storage objects first'), 'Rollback package requires forward migrations and storage-first controlled cleanup.');
assert(completion.includes('READY FOR EXPLICIT APPROVAL') && completion.includes('does not merge or publish'), 'Completion record stops at the explicit approval gate.');
assert(completion.includes('20260719211500_phase_8_authenticated_assignment_parity.sql'), 'Completion record identifies the Phase 8 migration.');

if (failures.length) {
  console.error(`Phase 8 release-gate verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Phase 8 release-gate verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
