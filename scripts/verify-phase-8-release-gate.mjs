import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const check = (value, message) => value ? passes.push(message) : failures.push(message);

const core = read('src/services/pilot/pilotCoreService.ts');
const admin = read('src/services/pilot/pilotAdminService.ts');
const form = read('src/components/pilot/PilotReportForm.tsx');
const student = read('src/components/pilot/PilotStudentDashboard.tsx');
const campus = read('src/components/pilot/PilotCampusSecurityDashboard.tsx');
const superAdmin = read('src/components/pilot/PilotSuperAdminDashboard.tsx');
const app = read('src/App.tsx');
const config = read('src/config/pilot.ts');
const brand = read('src/components/shared/InstitutionBrand.tsx');
const mobile = read('src/components/shared/MobileBottomNav.tsx');
const splash = read('src/components/shared/SplashScreen.tsx');
const sw = read('public/sw.js');
const manifest = JSON.parse(read('public/manifest.json'));
const migration = read('supabase/migrations/20260719213542_phase_8_authenticated_assignment_parity.sql');
const evidence = read('docs/PHASE_8_UAT_EVIDENCE.md');
const rollback = read('docs/PHASE_8_ROLLBACK_PACKAGE.md');
const completion = read('docs/PHASE_8_COMPLETE.md');

check(core.includes("'pilot-create-session'") && core.includes("'pilot-submit-report'"), 'Student session and report services are isolated Pilot Edge calls.');
check(['location_lat','location_lng','location_accuracy','location_description'].every((x) => core.includes(x)), 'Report payload preserves all location fields.');
check(core.includes("from('pilot_location_events')") && form.includes("source: 'initial_fix'"), 'Location events use the Pilot location table.');
check(form.includes('enableHighAccuracy: true') && form.includes('scenario.requires_live_tracking'), 'High-accuracy and live tracking workflows remain enabled.');
check(form.includes('uploadPilotAttachments') && core.includes('PILOT_MAX_ATTACHMENTS') && core.includes('PILOT_MAX_FILE_BYTES'), 'Evidence upload limits and workflow remain enabled.');
check(core.includes('createSignedUrl') && core.includes('PILOT_ATTACHMENT_BUCKET'), 'Private evidence retrieval uses signed URLs.');
check(form.includes('will not contact CPS, SAPS, an ambulance, security personnel or any emergency service'), 'Emergency simulation requires explicit no-dispatch consent.');

check(core.includes("table: 'pilot_reports'") && core.includes("table: 'pilot_report_events'"), 'Student report and timeline Realtime sources are subscribed.');
check(core.includes("table: 'pilot_notifications'") && core.includes("pilot_mark_notification_read"), 'Pilot notifications support Realtime and owner read receipts.');
check(campus.includes("'pilot_feature_tests'") && superAdmin.includes("'pilot_audit_logs'"), 'Campus and super-admin Realtime coverage includes telemetry and audit.');

check(['Overview','Incidents','Analytics','Students','Updates','Comms'].every((x) => campus.includes(`label: '${x}'`)), 'Campus portal matches all official operational sections.');
check(campus.includes("received: 'assessing'") && campus.includes("assigned: 'in_progress'") && campus.includes("in_progress: 'simulation_completed'"), 'Campus lifecycle is complete.');
check(campus.includes("transitionPilotReport(actionReport.id, 'assigned'") && campus.includes('userProfile.id'), 'Campus assignment uses the authenticated staff profile.');
check(campus.includes('Assign to me') && !campus.includes('Campus officer profile UUID'), 'Campus assignment exposes no raw UUID control.');
check(campus.includes('addPilotReportNote') && campus.includes('createPilotNotification'), 'Campus notes and student updates are available.');
check(['Overview','Operations','Campuses','Programmes','Participants','Analytics','Governance','Audit'].every((x) => superAdmin.includes(`label: '${x}'`)), 'Super-admin portal matches all official governance sections.');
check(admin.includes('pilot_export_data') && admin.includes('pilot_add_report_note'), 'Governed export and note RPCs remain connected.');

check(migration.includes('pilot_private.transition_report'), 'Remote-ledger Phase 8 assignment migration is committed.');
check(migration.includes("'security'::public.user_role") && migration.includes("'admin'::public.user_role"), 'Assignment supports verified security and acting admin roles.');
check(migration.includes('p_assigned_to <> v_actor') && migration.includes('raw_get_user_campus'), 'Admin self-ownership and security campus scope remain enforced.');
check(!['public.incidents','public.notifications','public.case_updates','send-push-notification'].some((x) => migration.includes(x)), 'Migration does not touch production case or dispatch paths.');

check(['/pilot','/pilot/session/:sessionId','/pilot/report/:reportId','/security/pilot','/admin/pilot'].every((x) => app.includes(`path="${x}"`)), 'All direct Pilot routes remain registered.');
for (const source of [core, admin, form, student, campus, superAdmin]) {
  check(!["from('incidents')","from('notifications')","from('case_updates')",'send-push-notification'].some((x) => source.includes(x)), 'Active Pilot source is isolated from production workflow tables.');
}
check(config.includes('No external emergency service or production dispatch workflow is contacted.'), 'Canonical no-dispatch warning remains permanent.');
check(student.includes('ready-pilot-student-dashboard') && campus.includes('ready-pilot-campus-parity') && superAdmin.includes('ready-pilot-super-admin-parity'), 'All role dashboards expose readiness markers.');

check([student,campus,superAdmin].every((x) => x.includes('role="tablist"') && x.includes('aria-selected=')), 'All role navigation exposes accessible tab state.');
check(mobile.includes("typeof maxItems === 'number' ? items.slice(0, maxItems) : items") && mobile.includes('overflow-x-auto') && mobile.includes('safe-area-inset-bottom'), 'Mobile navigation shows every section by default and remains safe-area aware.');
check(!student.includes('maxItems=') && !campus.includes('maxItems=') && !superAdmin.includes('maxItems='), 'Student, campus and super-admin portals do not opt into mobile truncation.');
check(brand.includes('getTutLogo(activeTheme)') && brand.includes('BRAND.assets.ccsfLogo'), 'Canonical CCSF and separate TUT theme logos remain paired.');
check(splash.includes('useReducedMotion') && splash.includes('InstitutionBrand'), 'Splash remains institutional and reduced-motion aware.');
check(manifest.theme_color === '#002F6C' && manifest.lang === 'en-ZA' && manifest.icons.some((x) => x.purpose === 'maskable'), 'PWA identity, locale and maskable icon remain correct.');
check(sw.includes("CACHE_VERSION = 'phase7-2026-07-19-v4'") && sw.includes("type === 'SKIP_WAITING'"), 'PWA cache replacement remains controlled.');

check(evidence.includes('Student → campus-security → super-admin lifecycle') && evidence.includes('Post-test residue verification'), 'UAT evidence records lifecycle and rollback residue.');
check(rollback.includes('READY FOR EXPLICIT APPROVAL') && rollback.includes('Approval to merge is not automatically approval to publish'), 'Rollback package preserves the explicit approval gate.');
check(completion.includes('READY FOR EXPLICIT APPROVAL') && completion.includes('20260719213542_phase_8_authenticated_assignment_parity.sql'), 'Completion record identifies final status and migration.');

if (failures.length) {
  console.error(`Phase 8 release-gate verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Phase 8 release-gate verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
