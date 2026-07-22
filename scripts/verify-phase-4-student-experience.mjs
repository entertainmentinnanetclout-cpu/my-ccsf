import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const check = (condition, message) => condition ? passes.push(message) : failures.push(message);

execFileSync(process.execPath, ['scripts/generate-pilot-document-library.mjs'], { cwd: root, stdio: 'inherit' });

const baseMigration = read('supabase/migrations/20260720233000_phase_4_student_dashboard_safety_resources.sql');
const releaseMigration = read('supabase/migrations/20260722190000_public_pilot_student_experience_hardening.sql');
const carousel = read('src/components/pilot/PilotDashboardCarousel.tsx');
const dashboard = read('src/components/pilot/PilotStudentDashboard.tsx');
const officialDashboard = read('src/pages/Dashboard.tsx');
const reportForm = read('src/components/pilot/PilotReportForm.tsx');
const academicCard = read('src/components/shared/AcademicFraudLaunchCard.tsx');
const guide = read('src/components/pilot/PilotUserGuideDialog.tsx');
const guideHook = read('src/hooks/pilot/usePilotGuide.ts');
const service = read('src/services/pilot/pilotExperienceService.ts');
const resources = read('src/pages/pilot/PilotResources.tsx');
const studentHome = read('src/components/student/StudentDashboardHome.tsx');
const generator = read('scripts/generate-pilot-document-library.mjs');
const pdfGenerator = read('scripts/pilot-document-library/pdf-generator.mjs');
const pdfEngine = read('scripts/pilot-document-library/pdf-brand-engine.mjs');
const sourceData = read('scripts/pilot-document-library/resource-data.mjs');

for (const table of ['pilot_carousel_slides', 'pilot_user_preferences', 'pilot_resource_documents']) {
  check(baseMigration.includes(`public.${table}`), `Phase 4 migration defines ${table}.`);
}
check(baseMigration.includes('pilot_get_guide_preferences') && baseMigration.includes('pilot_update_guide_preferences'), 'Cross-device guide preferences use authenticated RPCs.');
check(releaseMigration.includes('Academic Fraud & Fake Admin Services') && releaseMigration.includes('requires_attachment = true'), 'Migration activates evidence-backed academic fraud reporting.');
check(releaseMigration.includes('Building Structure & Student Services Guide') && releaseMigration.includes('My CCSF Pilot App User Guide'), 'Migration publishes the building and app user guides.');
check(releaseMigration.includes('is_active = false') && releaseMigration.includes('operating[- ]structure'), 'Migration blocks confidential operating material from public delivery.');

for (const marker of ['onTouchStart', 'onTouchEnd', 'Show previous Pilot slide', 'Show next Pilot slide', 'aria-roledescription="carousel"', 'CarouselSkeleton']) {
  check(carousel.includes(marker), `Managed Pilot carousel includes ${marker}.`);
}
check(dashboard.includes('<PilotDashboardCarousel') && dashboard.includes('<StudentDashboardHome campus={participant.campus} />'), 'Pilot home includes both managed content and campus/residence images.');
check(dashboard.includes('Official Student Portal') && officialDashboard.includes('Open Pilot'), 'Students can navigate between Official and Pilot modes.');
check(dashboard.includes("searchParams.get('open') !== 'academic-fraud'") && officialDashboard.includes('/pilot?open=academic-fraud'), 'Official reporting can deep-link to academic fraud Pilot intake.');
check(dashboard.includes('<AcademicFraudLaunchCard') && reportForm.includes('Academic Fraud & Fake Admin Services'), 'Academic fraud reporting is prominent in the Pilot student UI.');
check(reportForm.includes('academicServiceType') && reportForm.includes('academic_fraud_report_submission'), 'Academic fraud subtype and telemetry are captured.');
check(reportForm.includes('requiresAttachment && files.length === 0') && reportForm.includes('application/pdf'), 'Academic fraud requires private evidence and supports PDFs.');
for (const type of ['Paid mark-change offers', 'Fake sick letters or medical notes', 'Fake WIL placements or placement fees', 'Fake academic records or certificates', 'Impersonated admin services or registrations']) {
  check(academicCard.includes(type), `Academic fraud panel includes ${type}.`);
}
check(studentHome.includes('showCarousel = true') && studentHome.includes('<CampusCarousel campus={campus} />'), 'Shared student home supplies the campus/residence carousel.');

for (const control of ['Skip guide', 'Previous', 'Next', 'Finish guide', 'Close Pilot guide', 'Do not show automatically again']) {
  check(guide.includes(control), `Guide includes ${control} control.`);
}
check(guideHook.includes('loadPilotGuidePreferences') && guideHook.includes('updatePilotGuidePreferences'), 'Guide state remains profile-bound.');
check(service.includes('isPublicPilotResource') && service.includes('CONFIDENTIAL_RESOURCE_PATTERN'), 'Service applies a fail-closed public resource filter.');
check(service.includes('Building-Structure-Student-Services-Guide-v1.0.pdf') && service.includes('My-CCSF-Pilot-App-User-Guide-v1.0.pdf'), 'Fallback library contains both new public guides.');
check(!service.includes('Crime-Prevention-Unit-Operating-Structure-Pilot-Activation-Plan-v1.1.pptx'), 'Public fallback no longer exposes the confidential deck.');
check(resources.includes('Campus Guide, Building Directory & App User Guide') && resources.includes('Premium branded PDFs'), 'Resource centre presents the public PDF library.');
check(resources.includes('Official Student Portal') && resources.includes('Internal operating structures'), 'Resource centre includes mode navigation and explains public/private separation.');
check(resources.includes("featureKey: 'campus_guide_document_library_print'") && resources.includes('window.print()'), 'Document page printing remains measurable.');

check(generator.includes('makePublicDocuments') && generator.includes('fs.rmSync(privatePublicPath)'), 'Build generates only public documents and removes the old public deck.');
check(pdfEngine.includes("Campus safety forum logo design(1).png") && pdfEngine.includes('tut_light_theme.png'), 'PDF engine embeds the approved CCSF and TUT logo assets.');
check(pdfEngine.includes('/Subtype /Image') && pdfEngine.includes('/SMask'), 'PDF engine supports branded PNG images with transparency.');
check(pdfGenerator.includes('makePublicDocuments') && pdfGenerator.includes('Building 1-60 coverage dashboard'), 'Public generator covers all building numbers.');
check(pdfGenerator.includes('Report academic fraud and fake admin services') && pdfGenerator.includes('Official and Pilot navigation'), 'Documents cover fraud reporting and app navigation.');
for (const privateMarker of ['Ayanda Dube', 'Thipo Mapanga', 'Six-person functional allocation', 'Estimated financial framework']) {
  check(!sourceData.includes(privateMarker) && !pdfGenerator.includes(privateMarker), `Public document source excludes ${privateMarker}.`);
}

const pdfs = [
  ['My-CCSF-TUT-Pretoria-Campus-Safety-Security-Navigation-Handbook-v2.2.pdf', 18],
  ['My-CCSF-TUT-Pretoria-Campus-Building-Structure-Student-Services-Guide-v1.0.pdf', 12],
  ['My-CCSF-Pilot-App-User-Guide-v1.0.pdf', 9],
];
for (const [name, minimumPages] of pdfs) {
  const file = path.join(root, 'public/downloads', name);
  if (!fs.existsSync(file)) {
    failures.push(`${name} is missing.`);
    continue;
  }
  const pdf = fs.readFileSync(file);
  check(pdf.subarray(0, 5).toString() === '%PDF-', `${name} is a valid PDF.`);
  check(pdf.length > 80_000, `${name} contains embedded premium brand assets.`);
  check([...pdf.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length >= minimumPages, `${name} contains its complete page set.`);
  check((pdf.toString('latin1').match(/\/Subtype\s*\/Image/g) ?? []).length >= 2, `${name} embeds both approved logos.`);
}
check(!fs.existsSync(path.join(root, 'public/downloads/CCSF-Crime-Prevention-Unit-Operating-Structure-Pilot-Activation-Plan-v1.1.pptx')), 'Confidential operating deck is absent from public build output.');

if (failures.length) {
  console.error(`Phase 4 student experience verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Phase 4 student experience verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
