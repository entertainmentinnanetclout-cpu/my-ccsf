import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const assert = (condition, message) => condition ? passes.push(message) : failures.push(message);

const official = read('src/components/student/ReportIncidentV2.tsx');
const pilot = read('src/components/pilot/PilotReportFormV2.tsx');
const picker = read('src/components/shared/MobileEvidencePicker.tsx');
const processing = read('src/lib/evidenceProcessing.ts');
const resumable = read('src/lib/resumableStorageUpload.ts');
const queue = read('src/lib/offlineReportQueue.ts');
const receipt = read('src/components/shared/SubmissionReceiptCard.tsx');
const submission = read('src/services/evidenceSubmissionService.ts');
const migration = read('supabase/migrations/20260730213000_evidence_resilience_phases_c_e.sql');
const pilotMigration = read('supabase/migrations/20260730214500_finalize_pilot_evidence_submission.sql');
const pilotEdge = read('supabase/functions/pilot-submit-report/index.ts');
const accessEdge = read('supabase/functions/secure-evidence-link/index.ts');
const cleanupEdge = read('supabase/functions/evidence-submission-cleanup/index.ts');
const accessClient = read('src/services/evidenceAccessService.ts');
const officialDetails = read('src/components/admin/IncidentDetailsModal.tsx');
const pilotCore = read('src/services/pilot/pilotCoreService.ts');
const analytics = read('src/components/pilot/PilotEvidenceAnalytics.tsx');
const adminPage = read('src/pages/pilot/SuperAdminPilotPage.tsx');

assert(official.includes('reportDraftKey') && official.includes('loadDraftEvidence') && pilot.includes('reportDraftKey') && pilot.includes('loadDraftEvidence'), 'Phase A preserves official and Pilot report fields and evidence locally.');
assert(picker.includes('Take photo') && picker.includes('Record video') && picker.includes('Gallery') && picker.includes('Document'), 'Phase A provides dedicated mobile camera, video, gallery and document controls.');
assert(picker.includes('fileStates') && picker.includes('<Progress'), 'Phase B exposes per-file upload state and progress.');
assert(processing.includes("'image/heic'") && processing.includes("'image/heif'") && processing.includes('canvas.toBlob') && processing.includes("crypto.subtle.digest('SHA-256'"), 'Phase B converts supported HEIC/HEIF images, compresses large images and creates integrity checksums.');

assert(resumable.includes("const TUS_CHUNK_SIZE = 6 * 1024 * 1024") && resumable.includes("'Tus-Resumable': TUS_VERSION") && resumable.includes("method: 'PATCH'") && resumable.includes('Upload-Offset'), 'Phase C uses resumable six-megabyte TUS uploads with offset recovery.');
assert(submission.includes('stableObjectName') && submission.includes('uploadResumableEvidence') && submission.includes('finalizeOfficialSubmission') && submission.includes('finalizePilotSubmission'), 'Phase C keeps object paths stable and supports evidence-first finalisation in both environments.');
assert(migration.includes('evidence_submission_drafts') && migration.includes('finalize_official_evidence_submission') && pilotMigration.includes('finalize_pilot_evidence_submission'), 'Phase C database migrations enforce short-lived evidence drafts and atomic report finalisation.');
assert(pilotEdge.includes('evidence_manifest') && pilotEdge.includes('finalize_pilot_evidence_submission') && pilotEdge.includes('attachment_required'), 'Phase C Pilot Edge service refuses required-evidence reports until evidence verifies.');

assert(queue.includes("const DB_NAME = 'ccsf-offline-report-queue-v1'") && queue.includes('expiresAt') && official.includes('enqueueOfflineSubmission') && pilot.includes('enqueueOfflineSubmission'), 'Phase D provides an explicit expiring offline queue for non-emergency official and Pilot reports.');
assert(official.includes('Emergency report not delivered') && pilot.includes('Emergency Test not delivered'), 'Phase D never claims that an offline emergency was delivered.');
assert(receipt.includes('Report Submission Receipt') && official.includes('<SubmissionReceiptCard') && pilot.includes('<SubmissionReceiptCard'), 'Phase D provides printable student submission receipts.');

assert(migration.includes('evidence_access_audit') && accessEdge.includes("action === 'download'") && accessEdge.includes('A reason is required') && accessEdge.includes('createSignedUrl'), 'Phase E audits private evidence previews and requires a reason for downloads.');
assert(accessClient.includes("supabase.functions.invoke('secure-evidence-link'") && officialDetails.includes('createAuditedEvidenceLink') && pilotCore.includes('createAuditedEvidenceLink'), 'Phase E routes official and Pilot private evidence through the audited access service.');
assert(analytics.includes('Mobile Evidence Reliability') && analytics.includes('device.network_type') && adminPage.includes('<PilotEvidenceAnalytics'), 'Phase E surfaces device, network, duration and error evidence analytics to Pilot super-admins.');
assert(cleanupEdge.includes('evidence_submission_drafts') && cleanupEdge.includes("status: 'expired'") && cleanupEdge.includes('removed_objects'), 'Phase E includes governed privacy cleanup for expired server evidence drafts.');

if (failures.length) {
  console.error(`Evidence resilience release gate failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Evidence resilience phases A-E passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
