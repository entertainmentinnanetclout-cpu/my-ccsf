import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const check = (condition, message) => condition ? passes.push(message) : failures.push(message);

execFileSync(process.execPath, ['scripts/generate-pilot-document-library.mjs'], { cwd: root, stdio: 'inherit' });

const migration = read('supabase/migrations/20260720233000_phase_4_student_dashboard_safety_resources.sql');
const documentRelease = read('supabase/migrations/20260722073000_pilot_document_library_release.sql');
const carousel = read('src/components/pilot/PilotDashboardCarousel.tsx');
const dashboard = read('src/components/pilot/PilotStudentDashboard.tsx');
const guide = read('src/components/pilot/PilotUserGuideDialog.tsx');
const guideHook = read('src/hooks/pilot/usePilotGuide.ts');
const service = read('src/services/pilot/pilotExperienceService.ts');
const resources = read('src/pages/pilot/PilotResources.tsx');
const navigation = read('src/components/pilot/PilotStudentNavigation.tsx');
const studentHome = read('src/components/student/StudentDashboardHome.tsx');
const packageJson = read('package.json');
const generator = read('scripts/generate-pilot-document-library.mjs');
const pdfGenerator = read('scripts/pilot-document-library/pdf-generator.mjs');
const pptxGenerator = read('scripts/pilot-document-library/pptx-generator.mjs');
const slideContent = read('scripts/pilot-document-library/pptx-slides.mjs');
const pdfPath = path.join(root, 'public/downloads/My-CCSF-TUT-Pretoria-Campus-Safety-Security-Navigation-Handbook-v2.1.pdf');
const pptxPath = path.join(root, 'public/downloads/CCSF-Crime-Prevention-Unit-Operating-Structure-Pilot-Activation-Plan-v1.1.pptx');

for (const table of ['pilot_carousel_slides', 'pilot_user_preferences', 'pilot_resource_documents']) {
  check(migration.includes(`public.${table}`), `Phase 4 migration defines ${table}.`);
}
check(migration.includes('pilot_get_guide_preferences') && migration.includes('pilot_update_guide_preferences'), 'Cross-device guide preferences use authenticated RPCs.');
check(migration.includes('guide_auto_show') && migration.includes('guide_completed_at') && migration.includes('guide_dismissed_at'), 'Guide state stores automatic display, completion and dismissal against the student profile.');
check(migration.includes('display_order') && migration.includes('is_active') && migration.includes('starts_at') && migration.includes('expires_at'), 'Carousel content supports ordered, active and scheduled delivery.');
check(migration.includes('campus_targets') && migration.includes('private.pilot_can_read_phase4_content'), 'Carousel and document content are programme and campus scoped.');
check(migration.includes("'40000000-0000-4000-8000-000000000008'") && migration.includes("'Download the guide'"), 'All eight required Pilot information slides are seeded.');
check(migration.includes("'shield', null, 'none'"), 'The non-action welcome slide satisfies the button/action contract.');
check(migration.includes('revoke insert, update, delete on public.pilot_user_preferences'), 'Direct client preference writes are blocked.');
check(documentRelease.includes("version = '2.1'") && documentRelease.includes('Safety-Security-Navigation-Handbook-v2.1.pdf'), 'Release migration activates the updated campus handbook.');
check(documentRelease.includes("'1.1'") && documentRelease.includes('Operating-Structure-Pilot-Activation-Plan-v1.1.pptx'), 'Release migration activates the updated operating-structure presentation.');
check(documentRelease.includes('Open the Campus Guide & Document Library'), 'Managed carousel promotes the expanded document library.');

for (const marker of ['onTouchStart', 'onTouchEnd', 'Show previous Pilot slide', 'Show next Pilot slide', 'Pause automatic Pilot slide rotation', 'aria-roledescription="carousel"', 'pilot-carousel-empty-state', 'CarouselSkeleton']) {
  check(carousel.includes(marker), `Carousel includes ${marker}.`);
}
check(carousel.includes("current.image_fit === 'cover' ? 'object-cover' : 'bg-white object-contain p-8'"), 'Carousel preserves image proportions and explicit contain/cover behavior.');
check(carousel.includes('display_order') && carousel.includes('sort('), 'Carousel respects administrator-configured display order.');
check(carousel.includes('useReducedMotion'), 'Carousel respects reduced-motion accessibility preferences.');

check(dashboard.includes('<PilotDashboardCarousel') && dashboard.includes('showCarousel={false}'), 'Pilot dashboard renders its isolated carousel without duplicating the production carousel.');
check(dashboard.includes('usePilotGuide({ autoOpen: true })'), 'The guide opens automatically for eligible first-time Pilot students.');
check(dashboard.includes('Download the CCSF Pilot Safety Guide') && dashboard.includes('safety_guide_pdf_download'), 'Dashboard exposes and records the primary handbook download.');
check(dashboard.includes("navigate(PILOT_ROUTES.reviews)") && dashboard.includes("navigate(PILOT_ROUTES.resources)"), 'Carousel and quick actions navigate to Reviews and the document library.');
check(studentHome.includes('showCarousel = true') && studentHome.includes('{showCarousel && ('), 'Production student home keeps its carousel while allowing Pilot isolation.');

for (const title of ['Navigate the Pilot dashboard', 'Submit a standard report', 'Use Emergency Test correctly', 'Understand location permissions', 'Track a case from start to finish', 'Read staff notifications', 'Submit a Pilot review', 'Know the Pilot limitations']) {
  check(service.includes(title), `Controlled guide defaults include: ${title}.`);
}
for (const control of ['Skip guide', 'Previous', 'Next', 'Finish guide', 'Close Pilot guide', 'Do not show automatically again']) {
  check(guide.includes(control), `Guide includes ${control} control.`);
}
check(guide.includes('loadPilotGuideSteps'), 'The guide can load managed content while preserving controlled defaults.');
check(guideHook.includes('loadPilotGuidePreferences') && guideHook.includes('updatePilotGuidePreferences'), 'Guide controller loads and saves profile-bound state.');
check(guideHook.includes('resetGuide') && guideHook.includes('autoShow: false'), 'Guide supports reset and permanent automatic dismissal.');

check(resources.includes('Campus Guide & Document Library') && resources.includes('Download Campus Handbook'), 'Pilot resources page exposes the expanded document library.');
check(resources.includes('Open document') && resources.includes('PDF + PowerPoint'), 'Document cards provide direct open and download controls for both formats.');
check(resources.includes('loadPilotResourceDocuments') && resources.includes('pilot-document-library'), 'The page loads the managed multi-document collection.');
check(resources.includes('112') && resources.includes('10111') && resources.includes('10177') && resources.includes('086 110 2421'), 'Resource page provides core emergency and TUT contact numbers.');
check(navigation.includes("label: 'Safety Guide'"), 'Student Pilot navigation retains the established resource route label.');
check(service.includes('PILOT_RESOURCE_DOCUMENT_FALLBACKS') && service.includes('loadPilotResourceDocuments'), 'A static multi-document release fallback remains available.');
check(service.includes('Safety-Security-Navigation-Handbook-v2.1.pdf'), 'Fallback metadata points to the generated campus handbook.');
check(service.includes('Operating-Structure-Pilot-Activation-Plan-v1.1.pptx'), 'Fallback metadata points to the generated operating-structure deck.');
check(!service.includes("from('carousel_images')") && !carousel.includes("from('carousel_images')"), 'Phase 4 carousel does not read the production carousel table.');

check(packageJson.includes('node scripts/generate-pilot-document-library.mjs && vite build'), 'Every application build generates the approved Pilot resources first.');
check(generator.includes('makePdf') && generator.includes('makePptx'), 'Document generation entry point builds both downloadable formats.');
check(pdfGenerator.includes('Building 1-60 coverage dashboard') && pdfGenerator.includes('Report online academic scams early'), 'Handbook generator includes navigation and digital-scam prevention content.');
check(slideContent.includes('Six-person functional allocation') && slideContent.includes('Estimated financial framework'), 'Presentation source includes personnel allocation and finances.');
check(pptxGenerator.includes('application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'), 'PowerPoint generator emits a standards-based OOXML package.');

if (!fs.existsSync(pdfPath)) {
  failures.push('The generated campus safety and navigation handbook is missing.');
} else {
  const pdf = fs.readFileSync(pdfPath);
  check(pdf.subarray(0, 5).toString() === '%PDF-', 'Campus handbook is a valid PDF file.');
  check(pdf.length > 60_000, 'Campus handbook contains the complete branded vector content.');
  const pageMarkers = [...pdf.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length;
  check(pageMarkers >= 17, 'Campus handbook contains the complete multi-section A4 guide.');
}

if (!fs.existsSync(pptxPath)) {
  failures.push('The generated crime-prevention operating-structure presentation is missing.');
} else {
  const pptx = fs.readFileSync(pptxPath);
  check(pptx.subarray(0, 2).toString() === 'PK', 'Operating-structure presentation is a valid Office Open XML file.');
  check(pptx.length > 35_000, 'Operating-structure presentation contains the complete branded slide deck.');
  check(pptx.toString('latin1').includes('ppt/slides/slide19.xml'), 'Operating-structure presentation contains all 19 slides.');
}

if (failures.length) {
  console.error(`Phase 4 student experience verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Phase 4 student experience verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
