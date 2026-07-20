import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const requireText = (source, expected, label) => {
  if (!source.includes(expected)) throw new Error(`Phase 2 verification failed: ${label}`);
};
const forbidText = (source, forbidden, label) => {
  if (source.includes(forbidden)) throw new Error(`Phase 2 verification failed: ${label}`);
};

const migration = read('supabase/migrations/20260720192000_phase_2_pilot_report_routing_contract.sql');
const submit = read('supabase/functions/pilot-submit-report/index.ts');
const transition = read('supabase/functions/pilot-transition-status/index.ts');
const core = read('src/services/pilot/pilotCoreService.ts');
const admin = read('src/services/pilot/pilotAdminService.ts');
const types = read('src/types/pilot.ts');
const reportForm = read('src/components/pilot/PilotReportForm.tsx');
const campusDashboard = read('src/components/pilot/PilotCampusSecurityDashboard.tsx');

requireText(migration, 'pilot_simulated_severity', 'Reports must persist a server-derived simulated severity.');
requireText(migration, 'pilot_routing_destination', 'Reports must persist an explicit Pilot-only routing destination.');
requireText(migration, 'routing_campus public.campus_location', 'Reports must persist the authorised campus queue.');
requireText(migration, 'pilot_reports_routing_campus_matches_campus', 'Routing campus must be constrained to the report campus.');
requireText(migration, 'private.pilot_program_is_active_for_campus', 'Campus access must require an active eligible programme.');
requireText(migration, 'private.pilot_can_access_report', 'Report visibility must be enforced by a server-side access helper.');
requireText(migration, "pr.routing_destination = 'campus_security'", 'Campus-security access must require the campus queue destination.');
requireText(migration, 'drop policy if exists pilot_reports_insert', 'Direct authenticated Pilot report inserts must be removed.');
requireText(migration, 'revoke insert, update, delete on public.pilot_reports from anon, authenticated', 'Report writes must be function-only.');
requireText(migration, "'simulation_only', true", 'Report routing must write simulation-only audit evidence.');

requireText(submit, ".from('pilot_reports')", 'Pilot submission must write the isolated Pilot report table.');
requireText(submit, 'isProgrammeOpen(program, session.campus)', 'Submission must enforce active programme and campus eligibility.');
requireText(submit, "report.routing_destination !== 'campus_security'", 'Submission must verify the database routing result.');
requireText(submit, 'external_dispatch: false', 'Submission audit must explicitly record no external dispatch.');
forbidText(submit, ".from('incidents')", 'Pilot submission must never write production incidents.');
forbidText(submit, 'security_notifications', 'Pilot submission must never write production security notifications.');
forbidText(submit, 'send-push-notification', 'Pilot submission must never invoke production push delivery.');

requireText(transition, 'report.routing_campus', 'Status changes must use the server-routed campus.');
requireText(transition, 'isProgrammeOpen(program, report.routing_campus)', 'Status changes must require an active eligible programme.');
requireText(transition, 'external_dispatch: false', 'Status audit must preserve the no-dispatch boundary.');
forbidText(transition, ".from('incidents')", 'Pilot status changes must never update production incidents.');
forbidText(transition, 'security_notifications', 'Pilot status changes must never write production notifications.');

requireText(core, "invokePilotFunction<{ report: PilotReport }>('pilot-submit-report'", 'The student form must submit through the authenticated Pilot function.');
requireText(core, ".from('pilot_reports')", 'Student tracking must read isolated Pilot reports.');
requireText(admin, ".from('pilot_reports')", 'Campus and super-admin queues must read isolated Pilot reports.');
forbidText(core, ".from('incidents')", 'Student Pilot services must not read production incidents.');
forbidText(admin, ".from('incidents')", 'Staff Pilot services must not read production incidents.');
forbidText(core, 'security_notifications', 'Student Pilot services must not use production notifications.');
forbidText(admin, 'security_notifications', 'Staff Pilot services must not use production notifications.');

requireText(types, "export type PilotSimulatedSeverity = 'low' | 'medium' | 'high' | 'critical'", 'Frontend types must expose simulated severity.');
requireText(types, "export type PilotRoutingDestination = 'campus_security'", 'Frontend types must expose the campus-security destination.');
requireText(reportForm, 'The case is now visible in the authorised campus-security Pilot queue.', 'Students must receive a deterministic queue confirmation.');
requireText(campusDashboard, 'Realtime Campus Queue', 'Campus security must have a realtime Pilot case queue.');
requireText(campusDashboard, 'No production case is read, written or dispatched.', 'Campus operations must display the production-isolation boundary.');

console.log('Phase 2 Pilot reporting and case-routing verification passed.');