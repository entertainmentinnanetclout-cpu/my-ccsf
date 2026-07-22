import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
execFileSync(process.execPath, ['scripts/generate-pilot-document-library.mjs'], { cwd: root, stdio: 'inherit' });

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const dashboard = read('src/components/pilot/PilotStudentDashboard.tsx');
const official = read('src/pages/Dashboard.tsx');
const report = read('src/components/pilot/PilotReportForm.tsx');
const service = read('src/services/pilot/pilotExperienceService.ts');
const migration = read('supabase/migrations/20260722190000_public_pilot_student_experience_hardening.sql');
const failures = [];
const requireOutcome = (value, message) => { if (!value) failures.push(message); };

requireOutcome(dashboard.includes('<PilotDashboardCarousel') && dashboard.includes('<StudentDashboardHome campus={participant.campus} />'), 'Both Pilot and campus/residence carousels must render.');
requireOutcome(dashboard.includes('Official Student Portal') && official.includes('Open Pilot'), 'Official/Pilot navigation must be available.');
requireOutcome(report.includes('academic_fraud_report_submission') && report.includes('requiresAttachment && files.length === 0'), 'Academic fraud evidence workflow must be enabled.');
requireOutcome(service.includes('isPublicPilotResource') && service.includes('CONFIDENTIAL_RESOURCE_PATTERN'), 'Public resource filtering must be active.');
requireOutcome(migration.includes('Academic Fraud & Fake Admin Services') && migration.includes('My CCSF Pilot App User Guide'), 'Database release must include the fraud workflow and user guide.');

const pdfs = [
  'My-CCSF-TUT-Pretoria-Campus-Safety-Security-Navigation-Handbook-v2.2.pdf',
  'My-CCSF-TUT-Pretoria-Campus-Building-Structure-Student-Services-Guide-v1.0.pdf',
  'My-CCSF-Pilot-App-User-Guide-v1.0.pdf',
];
for (const name of pdfs) {
  const file = path.join(root, 'public/downloads', name);
  requireOutcome(fs.existsSync(file), `${name} must be generated.`);
  if (fs.existsSync(file)) {
    const pdf = fs.readFileSync(file);
    requireOutcome(pdf.subarray(0, 5).toString() === '%PDF-', `${name} must be a valid PDF.`);
    requireOutcome(pdf.length > 100_000, `${name} must contain premium embedded brand assets.`);
  }
}
requireOutcome(!fs.existsSync(path.join(root, 'public/downloads/CCSF-Crime-Prevention-Unit-Operating-Structure-Pilot-Activation-Plan-v1.1.pptx')), 'Confidential operating deck must not be public.');

if (failures.length) {
  console.error('Phase 4 public Pilot release verification failed:\n' + failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}
console.log('Phase 4 public Pilot release verification passed.');
