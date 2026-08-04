import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const requireText = (content, text, message) => { if (!content.includes(text)) throw new Error(message); };

const migration = read('supabase/migrations/20260804160000_institutional_hardening_phase_1.sql');
const emergency = read('src/components/student/EmergencyReport.tsx');
const tracking = read('src/hooks/useLocationTracking.ts');
const evidence = read('src/lib/evidenceProcessing.ts');
const picker = read('src/components/shared/MobileEvidencePicker.tsx');
const submission = read('src/services/evidenceSubmissionService.ts');
const avatar = read('src/components/shared/AvatarUpload.tsx');
const cases = read('src/components/student/MyCaseReports.tsx');
const quest = read('src/features/safety-quest/SafetyQuestGame.tsx');

for (const marker of ['incidents_workflow_integrity', 'evidence_submission_integrity', 'create_emergency_alert', 'record_emergency_location_update', 'student_safety_presence_quality']) requireText(migration, marker, `Missing database hardening marker: ${marker}`);
requireText(migration, 'video/quicktime', 'Database and storage must support iOS QuickTime evidence.');
requireText(migration, 'temporary brand transfer insert', 'Dormant anonymous brand-transfer policy cleanup is missing.');
requireText(emergency, 'env(safe-area-inset-bottom)', 'Emergency button must respect mobile safe areas.');
requireText(emergency, "rpc('create_emergency_alert'", 'Emergency creation must use the vetted server function.');
requireText(tracking, "rpc('record_emergency_location_update'", 'Emergency location updates must use the vetted server function.');
if (tracking.includes(".from('incidents').update")) throw new Error('Client-side direct incident location mutation must be removed.');
requireText(evidence, 'video/quicktime', 'Evidence processing must recognise modern iOS video.');
requireText(picker, '.mov', 'Mobile picker must expose MOV/QuickTime selection.');
requireText(submission, 'normaliseEvidenceMimeType(file)', 'Evidence manifests must not use an empty raw browser MIME value.');
requireText(avatar, 'maxDimension: 1024', 'Avatar processing must produce a high-quality standard image.');
requireText(avatar, 'h-11 w-11', 'Avatar control must meet a mobile touch target.');
requireText(cases, 'submitted_by.eq.', 'Anonymous submissions must remain visible in My Cases.');
if (quest.includes('cpsLogo')) throw new Error('Safety Quest still renders a duplicate CPS logo.');

console.log('Institutional hardening Phase 1 verification passed.');
