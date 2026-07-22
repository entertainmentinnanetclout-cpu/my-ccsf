import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const requireOutcome = (value, message) => { if (!value) failures.push(message); };

const app = read('src/App.tsx');
const student = read('src/components/pilot/PilotStudentDashboard.tsx');
const report = read('src/components/pilot/PilotReportForm.tsx');
const resources = read('src/pages/pilot/PilotResources.tsx');
const service = read('src/services/pilot/pilotExperienceService.ts');
const contentAdmin = read('src/pages/pilot/PilotContentManagement.tsx');
const reviewPage = read('src/pages/pilot/PilotReviews.tsx');
const reviewAdmin = read('src/pages/pilot/PilotReviewManagement.tsx');
const vercel = read('vercel.json');

requireOutcome(app.includes('path="/pilot/reviews"') && app.includes('path="/pilot/resources"'), 'Pilot review and resource routes must be registered.');
requireOutcome(student.includes('PILOT_ROUTES.report(report.id)') && student.includes('Official Student Portal'), 'Pilot cases and mode switching must be navigable.');
requireOutcome(report.includes('emergencyConsent') && report.includes('academic_fraud_report_submission'), 'Emergency and academic-fraud workflows must remain measurable.');
requireOutcome(resources.includes('Campus Guide, Building Directory & App User Guide'), 'Public resource centre must be active.');
requireOutcome(service.includes('CONFIDENTIAL_RESOURCE_PATTERN') && service.includes('isPublicPilotResource'), 'Confidential documents must be blocked from public loading.');
requireOutcome(contentAdmin.includes('Dashboard carousel') && contentAdmin.includes('First-login user guide'), 'Managed Pilot content controls must remain available.');
requireOutcome(reviewPage.includes('submitPilotReview') && reviewAdmin.includes('exportReviews'), 'Student reviews and admin exports must remain functional.');
requireOutcome(vercel.includes('"destination": "/index.html"'), 'Direct Pilot routes must retain SPA rewrites.');

for (const productionTable of ["from('incidents')", "from('feedback')", "from('notifications')", "from('case_updates')"]) {
  requireOutcome(!service.includes(productionTable), `Pilot resource service must not use ${productionTable}.`);
}

const pdfs = [
  'My-CCSF-TUT-Pretoria-Campus-Safety-Security-Navigation-Handbook-v2.2.pdf',
  'My-CCSF-TUT-Pretoria-Campus-Building-Structure-Student-Services-Guide-v1.0.pdf',
  'My-CCSF-Pilot-App-User-Guide-v1.0.pdf',
];
for (const name of pdfs) {
  const file = path.join(root, 'public/downloads', name);
  requireOutcome(fs.existsSync(file), `${name} must exist.`);
  if (fs.existsSync(file)) requireOutcome(fs.readFileSync(file).subarray(0, 5).toString() === '%PDF-', `${name} must be structurally valid.`);
}
requireOutcome(!fs.existsSync(path.join(root, 'public/downloads/CCSF-Crime-Prevention-Unit-Operating-Structure-Pilot-Activation-Plan-v1.1.pptx')), 'Confidential operating deck must be absent.');

if (failures.length) {
  console.error('Phase 5 public release verification failed:\n' + failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}
console.log('Phase 5 public release verification passed.');
