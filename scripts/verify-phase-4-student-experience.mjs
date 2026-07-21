import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const check = (condition, message) => condition ? passes.push(message) : failures.push(message);

const migration = read('supabase/migrations/20260720233000_phase_4_student_dashboard_safety_resources.sql');
const carousel = read('src/components/pilot/PilotDashboardCarousel.tsx');
const dashboard = read('src/components/pilot/PilotStudentDashboard.tsx');
const guide = read('src/components/pilot/PilotUserGuideDialog.tsx');
const guideHook = read('src/hooks/pilot/usePilotGuide.ts');
const service = read('src/services/pilot/pilotExperienceService.ts');
const resources = read('src/pages/pilot/PilotResources.tsx');
const navigation = read('src/components/pilot/PilotStudentNavigation.tsx');
const studentHome = read('src/components/student/StudentDashboardHome.tsx');
const pdfPath = path.join(root, 'public/downloads/CCSF-Pilot-Safety-Guide-v1.0.pdf');

for (const table of ['pilot_carousel_slides', 'pilot_user_preferences', 'pilot_resource_documents']) {
  check(migration.includes(`public.${table}`), `Phase 4 migration defines ${table}.`);
}
check(migration.includes('pilot_get_guide_preferences') && migration.includes('pilot_update_guide_preferences'), 'Cross-device guide preferences use authenticated RPCs.');
check(migration.includes('guide_auto_show') && migration.includes('guide_completed_at') && migration.includes('guide_dismissed_at'), 'Guide state stores automatic display, completion and dismissal against the student profile.');
check(migration.includes('display_order') && migration.includes('is_active') && migration.includes('starts_at') && migration.includes('expires_at'), 'Carousel content supports ordered, active and scheduled delivery.');
check(migration.includes('campus_targets') && migration.includes('private.pilot_can_read_phase4_content'), 'Carousel and document content are programme and campus scoped.');
check(migration.includes("'40000000-0000-4000-8000-000000000008'") && migration.includes("'Download the guide'"), 'All eight required Pilot information slides are seeded.');
check(migration.includes("'shield', null, 'none'"), 'The non-action welcome slide satisfies the button/action contract.');
check(migration.includes("'/downloads/CCSF-Pilot-Safety-Guide-v1.0.pdf'"), 'The versioned safety document points to the approved PDF path.');
check(migration.includes('revoke insert, update, delete on public.pilot_user_preferences'), 'Direct client preference writes are blocked.');

for (const marker of ['onTouchStart', 'onTouchEnd', 'Show previous Pilot slide', 'Show next Pilot slide', 'Pause automatic Pilot slide rotation', 'aria-roledescription="carousel"', 'pilot-carousel-empty-state', 'CarouselSkeleton']) {
  check(carousel.includes(marker), `Carousel includes ${marker}.`);
}
check(carousel.includes("current.image_fit === 'cover' ? 'object-cover' : 'bg-white object-contain p-8'"), 'Carousel preserves image proportions and explicit contain/cover behavior.');
check(carousel.includes('display_order') && carousel.includes('sort('), 'Carousel respects administrator-configured display order.');
check(carousel.includes('useReducedMotion'), 'Carousel respects reduced-motion accessibility preferences.');

check(dashboard.includes('<PilotDashboardCarousel') && dashboard.includes('showCarousel={false}'), 'Pilot dashboard renders its isolated carousel without duplicating the production carousel.');
check(dashboard.includes('usePilotGuide({ autoOpen: true })'), 'The guide opens automatically for eligible first-time Pilot students.');
check(dashboard.includes('Download the CCSF Pilot Safety Guide') && dashboard.includes('safety_guide_pdf_download'), 'Dashboard exposes and records the handbook download.');
check(dashboard.includes("navigate(PILOT_ROUTES.reviews)") && dashboard.includes("navigate(PILOT_ROUTES.resources)"), 'Carousel and quick actions navigate to Reviews and Safety Guide.');
check(studentHome.includes('showCarousel = true') && studentHome.includes('{showCarousel && ('), 'Production student home keeps its carousel while allowing Pilot isolation.');

for (const title of [
  'Navigate the Pilot dashboard',
  'Submit a standard report',
  'Use Emergency Test correctly',
  'Understand location permissions',
  'Track a case from start to finish',
  'Read staff notifications',
  'Submit a Pilot review',
  'Know the Pilot limitations',
]) check(service.includes(title), `Controlled guide defaults include: ${title}.`);
for (const control of ['Skip guide', 'Previous', 'Next', 'Finish guide', 'Close Pilot guide', 'Do not show automatically again']) {
  check(guide.includes(control), `Guide includes ${control} control.`);
}
check(guide.includes('loadPilotGuideSteps'), 'The guide can load Phase 5 managed content while preserving Phase 4 defaults.');
check(guideHook.includes('loadPilotGuidePreferences') && guideHook.includes('updatePilotGuidePreferences'), 'Guide controller loads and saves profile-bound state.');
check(guideHook.includes('resetGuide') && guideHook.includes('autoShow: false'), 'Guide supports reset and permanent automatic dismissal.');

check(resources.includes('Open User Guide') && resources.includes('Reset Guide Across Devices'), 'Safety Guide page can reopen and reset the user guide.');
check(resources.includes('Download Safety PDF') && resources.includes('Open PDF'), 'Safety Guide page exposes PDF download and direct open controls.');
check(resources.includes('112') && resources.includes('10111') && resources.includes('10177') && resources.includes('086 110 2421'), 'Safety Guide page provides core verified emergency and TUT contact numbers.');
check(navigation.includes("label: 'Safety Guide'"), 'Student Pilot navigation labels the resource tab Safety Guide.');
check(service.includes('PILOT_SAFETY_GUIDE_FALLBACK') && service.includes('/downloads/CCSF-Pilot-Safety-Guide-v1.0.pdf'), 'A valid static PDF fallback remains available if resource metadata cannot load.');
check(!service.includes("from('carousel_images')") && !carousel.includes("from('carousel_images')"), 'Phase 4 carousel does not read the production carousel table.');

if (!fs.existsSync(pdfPath)) {
  failures.push('The print-ready Phase 4 safety PDF is missing.');
} else {
  const pdf = fs.readFileSync(pdfPath);
  check(pdf.subarray(0, 5).toString() === '%PDF-', 'Safety handbook is a valid PDF file.');
  check(pdf.length > 250_000, 'Safety handbook contains high-resolution branded content.');
  const pageMarkers = [...pdf.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length;
  check(pageMarkers >= 12, 'Safety handbook contains at least 12 A4 content pages.');
}

if (failures.length) {
  console.error(`Phase 4 student experience verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Phase 4 student experience verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
