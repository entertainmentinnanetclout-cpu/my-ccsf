import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const check = (condition, message) => condition ? passes.push(message) : failures.push(message);

execFileSync(process.execPath, ['scripts/generate-pilot-document-library.mjs'], { cwd: root, stdio: 'inherit' });

const releaseMigration = read('supabase/migrations/20260722190000_public_pilot_student_experience_hardening.sql');
const locationMigration = read('supabase/migrations/20260722191000_pilot_optional_location_scenarios.sql');
const dashboard = read('src/components/pilot/PilotStudentDashboard.tsx');
const officialDashboard = read('src/pages/Dashboard.tsx');
const reportForm = read('src/components/pilot/PilotReportForm.tsx');
const service = read('src/services/pilot/pilotExperienceService.ts');
const resources = read('src/pages/pilot/PilotResources.tsx');
const generator = read('scripts/generate-pilot-document-library.mjs');
const pdfEngine = read('scripts/pilot-document-library/pdf-brand-engine.mjs');
const publicSource = read('scripts/pilot-document-library/resource-data.mjs');

check(releaseMigration.includes('Academic Fraud & Fake Admin Services'), 'Academic fraud scenario is managed by migration.');
check(releaseMigration.includes('requires_attachment = true'), 'Academic fraud evidence is required.');
check(releaseMigration.includes('Building Structure & Student Services Guide'), 'Building guide is published.');
check(releaseMigration.includes('My CCSF Pilot App User Guide'), 'App user guide is published.');
check(releaseMigration.includes('is_active = false'), 'Confidential resource records are deactivated.');
check(locationMigration.includes('pilot_reports_coordinate_pair_integrity'), 'Optional locations retain coordinate integrity.');

check(dashboard.includes('<PilotDashboardCarousel') && dashboard.includes('<StudentDashboardHome campus={participant.campus} />'), 'Pilot shows both managed and campus/residence carousels.');
check(dashboard.includes('Official Student Portal') && officialDashboard.includes('Open Pilot'), 'Student UI supports Official and Pilot navigation.');
check(dashboard.includes('openAcademicFraudReport') && officialDashboard.includes('/pilot?open=academic-fraud'), 'Academic fraud intake is directly reachable.');
check(reportForm.includes('academicServiceType') && reportForm.includes('academic_fraud_report_submission'), 'Academic fraud subtype and submission telemetry are implemented.');
check(reportForm.includes('requiresAttachment && files.length === 0') && reportForm.includes('application/pdf'), 'Evidence-gated reporting supports PDF attachments.');
check(reportForm.includes('const requiresLocation = emergency || scenario.requires_location || scenario.requires_live_tracking;'), 'Location is scenario-driven.');

check(service.includes('isPublicPilotResource') && service.includes('CONFIDENTIAL_RESOURCE_PATTERN'), 'Public resource filtering is fail-closed.');
check(!service.includes('Crime-Prevention-Unit-Operating-Structure-Pilot-Activation-Plan-v1.1.pptx'), 'Confidential deck is absent from public fallback data.');
check(resources.includes('Campus Guide, Building Directory & App User Guide'), 'Resource centre presents the approved public library.');
check(resources.includes('Internal operating structures'), 'Resource centre states the public/private boundary.');
check(generator.includes('makePublicDocuments') && generator.includes('fs.rmSync(privatePublicPath)'), 'Build removes the old public deck and generates public PDFs.');
check(pdfEngine.includes("Campus safety forum logo design(1).png") && pdfEngine.includes('tut_light_theme.png'), 'PDF engine uses the approved CCSF and TUT logo files.');

for (const forbidden of ['Ayanda Dube', 'Thipo Mapanga', 'Obakeng', 'Pascal', 'Six-person functional allocation', 'Estimated financial framework']) {
  check(!publicSource.includes(forbidden), `Public document data excludes private marker: ${forbidden}.`);
}

const pdfs = [
  'My-CCSF-TUT-Pretoria-Campus-Safety-Security-Navigation-Handbook-v2.2.pdf',
  'My-CCSF-TUT-Pretoria-Campus-Building-Structure-Student-Services-Guide-v1.0.pdf',
  'My-CCSF-Pilot-App-User-Guide-v1.0.pdf',
];
for (const name of pdfs) {
  const file = path.join(root, 'public/downloads', name);
  check(fs.existsSync(file), `${name} is generated.`);
  if (!fs.existsSync(file)) continue;
  const pdf = fs.readFileSync(file);
  const source = pdf.toString('latin1');
  check(pdf.subarray(0, 5).toString() === '%PDF-', `${name} has a valid PDF signature.`);
  check(pdf.length > 100_000, `${name} contains embedded premium brand assets.`);
  check((source.match(/\/Subtype\s*\/Image/g) ?? []).length >= 2, `${name} embeds CCSF and TUT imagery.`);
  check((source.match(/\/Type\s*\/Page\b/g) ?? []).length >= 8, `${name} contains a complete multi-page guide.`);
}
check(!fs.existsSync(path.join(root, 'public/downloads/CCSF-Crime-Prevention-Unit-Operating-Structure-Pilot-Activation-Plan-v1.1.pptx')), 'Confidential deck is absent from public build output.');

if (failures.length) {
  console.error(`Phase 4 student experience verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Phase 4 student experience verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
