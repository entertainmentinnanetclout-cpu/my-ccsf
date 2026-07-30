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
const hardening = read('supabase/migrations/20260720203000_phase_2_reporting_flow_hardening.sql');
const optionalLocation = read('supabase/migrations/20260722191000_pilot_optional_location_scenarios.sql');
const sessionContinuity = read('supabase/migrations/20260721054500_pilot_session_continuity_and_seven_day_window.sql');
const evidenceFinalisation = read('supabase/migrations/20260730214500_finalize_pilot_evidence_submission.sql');
const submit = read('supabase/functions/pilot-submit-report/index.ts');
const transition = read('supabase/functions/pilot-transition-status/index.ts');
const core = read('src/services/pilot/pilotCoreService.ts');
const evidenceService = read('src/services/evidenceSubmissionService.ts');
const admin = read('src/services/pilot/pilotAdminService.ts');
const types = read('src/types/pilot.ts');
const reportEntry = read('src/components/pilot/PilotReportForm.tsx');
const reportForm = read('src/components/pilot/PilotReportFormV2.tsx');
const campusDashboard = read('src/components/pilot/PilotCampusSecurityDashboard.tsx');
const tracking = read('src/pages/pilot/PilotReportTracking.tsx');

requireText(migration, 'pilot_simulated_severity', 'Server-derived severity is required.');
requireText(migration, 'pilot_routing_destination', 'A Pilot-only route is required.');
requireText(migration, 'pilot_reports_routing_campus_matches_campus', 'Route campus must match the case campus.');
requireText(hardening, 'drop policy if exists pilot_reports_insert', 'Direct inserts must be removed.');
requireText(hardening, 'revoke insert, update, delete on public.pilot_reports from anon, authenticated', 'Writes must be function-only.');
requireText(hardening, 'campus_staff_count', 'Campus recipient coverage must be recorded.');
requireText(hardening, 'fallback_to_super_admin', 'Super-admin fallback must be recorded.');
requireText(hardening, 'report_routed_to_campus_queue', 'Each route must be audited.');
requireText(hardening, "'external_dispatch', false", 'No-dispatch evidence is required.');

requireText(optionalLocation, 'drop constraint if exists pilot_reports_coordinates_required', 'Legacy all-report coordinate enforcement must be removed.');
requireText(optionalLocation, 'pilot_reports_coordinate_pair_integrity', 'Optional coordinates must still be supplied as a valid pair.');
requireText(optionalLocation, 'pilot_reports_location_description_integrity', 'A readable location remains required whenever coordinates are supplied.');
requireText(sessionContinuity, "interval '7 days'", 'Pilot testing sessions must remain usable for a practical testing window.');
requireText(sessionContinuity, "s.status = 'in_progress'", 'Current authorised sessions must be refreshed safely.');

requireText(evidenceFinalisation, 'finalize_pilot_evidence_submission', 'Evidence-first Pilot finalisation must be database-atomic.');
requireText(evidenceFinalisation, "status = 'finalized'", 'Finalised Pilot evidence drafts must close explicitly.');
requireText(evidenceFinalisation, "bucket_id = 'pilot-report-attachments'", 'Uploaded Pilot evidence must be verified in private storage.');

requireText(submit, ".from('pilot_reports')", 'Legacy emergency submission must remain isolated.');
requireText(submit, 'isProgrammeOpen(program, session.campus)', 'Programme and campus eligibility must be checked.');
requireText(submit, 'emergency_consent_required', 'Emergency consent must be enforced by the server.');
requireText(submit, 'const locationRequired = emergency || scenario?.requires_location === true || scenario?.requires_live_tracking === true;', 'Location requirements must be derived from the authorised scenario.');
requireText(submit, "throw new PilotHttpError(400, 'The selected Pilot scenario requires a captured location.'", 'Configured location scenarios must remain fail-closed.');
requireText(submit, "optionalText(source.location_description, 'location_description'", 'Evidence-only scenarios may omit a location.');
requireText(submit, 'report_location_pair_invalid', 'Partial coordinate pairs must be rejected.');
requireText(submit, 'attachment_required', 'Required-evidence scenarios must fail closed before report creation.');
requireText(submit, "rpc('finalize_pilot_evidence_submission'", 'Evidence-first cases must use atomic server finalisation.');
requireText(submit, 'external_dispatch: false', 'Submission must preserve the no-dispatch boundary.');
forbidText(submit, ".from('incidents')", 'Production reports must not be written.');
forbidText(submit, 'security_notifications', 'Production notifications must not be written.');
forbidText(submit, 'send-push-notification', 'Production delivery must not be invoked.');

requireText(transition, 'report.routing_campus', 'Status changes must use the routed campus.');
requireText(transition, 'isProgrammeOpen(program, report.routing_campus)', 'Status changes must verify programme scope.');
requireText(transition, 'external_dispatch: false', 'Status changes must preserve isolation.');

requireText(core, "invokePilotFunction<{ report: PilotReport }>('pilot-submit-report'", 'Emergency client submissions must use the secured function.');
requireText(core, 'emergency_consent: input.emergency_consent ?? false', 'The client must send emergency consent.');
requireText(core, 'ensureActivePilotSession', 'Expired Pilot sessions must renew automatically.');
requireText(core, ".gt('expires_at', nowIso)", 'Expired session records must not reopen the dashboard.');
forbidText(core, ".from('incidents')", 'Student services must remain isolated.');
forbidText(admin, ".from('incidents')", 'Staff services must remain isolated.');

requireText(types, "export type PilotSimulatedSeverity = 'low' | 'medium' | 'high' | 'critical'", 'Severity types must be available.');
requireText(types, "export type PilotRoutingDestination = 'campus_security'", 'Routing types must be available.');
requireText(types, 'emergency_consent?: boolean', 'Consent must be part of the report input.');
requireText(reportEntry, 'PilotReportFormV2 as PilotReportForm', 'The public Pilot entry must use the resilient V2 form.');
requireText(reportForm, 'const requiresLocation = emergency || scenario.requires_location || scenario.requires_live_tracking;', 'The form must follow scenario-driven location requirements.');
requireText(reportForm, 'if (requiresLocation && (!location || !locationDescription.trim() || locationLoading)) return false;', 'Required-location scenarios must block incomplete submission.');
requireText(reportForm, 'emergency_consent: emergency ? emergencyConsent : false', 'The form must send consent.');
requireText(reportForm, 'No title, category or written explanation is required.', 'Emergency input must remain minimal.');
requireText(reportForm, 'ensureActivePilotSession(participant, workingSession)', 'Submission must resolve a current session before sending.');
requireText(reportForm, 'ensureActivePilotSession(participant, null)', 'Emergency submission must retry once after a stale-session race.');
requireText(reportForm, 'processEvidenceFirst', 'Non-emergency Pilot reports must use evidence-first processing.');
requireText(reportForm, 'requiredEvidence: requiresAttachment', 'Scenario evidence requirements must reach the secure draft.');
requireText(evidenceService, 'finalizePilotSubmission', 'The Pilot client must finalise through the secured Edge Function.');
requireText(campusDashboard, 'Realtime Campus Queue', 'Campus staff need a live queue.');
requireText(campusDashboard, 'Tap any incident card to open the complete case', 'Cards must open full details.');
requireText(tracking, 'Student Information', 'Case detail must show student identity.');
requireText(tracking, 'The readable location is shown first', 'Readable location must be prioritised when present.');
requireText(tracking, 'Full Incident Details', 'The complete case must be visible.');

console.log('Phase 2 Pilot reporting, evidence-first routing, scenario location and session continuity verification passed.');
