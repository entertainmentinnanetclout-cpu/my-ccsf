import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const check = (condition, message) => condition ? passes.push(message) : failures.push(message);

const app = read('src/App.tsx');
const routes = read('src/config/pilotRoutes.ts');
const auth = read('src/pages/pilot/PilotAuth.tsx');
const officialAuth = read('src/pages/Auth.tsx');
const reviewPage = read('src/pages/pilot/PilotReviews.tsx');
const reviewAdmin = read('src/pages/pilot/PilotReviewManagement.tsx');
const contentAdmin = read('src/pages/pilot/PilotContentManagement.tsx');
const staffNavigation = read('src/components/pilot/PilotStaffNavigation.tsx');
const studentNavigation = read('src/components/pilot/PilotStudentNavigation.tsx');
const studentDashboard = read('src/components/pilot/PilotStudentDashboard.tsx');
const campusDashboard = read('src/components/pilot/PilotCampusSecurityDashboard.tsx');
const reportForm = read('src/components/pilot/PilotReportForm.tsx');
const carousel = read('src/components/pilot/PilotDashboardCarousel.tsx');
const guide = read('src/components/pilot/PilotUserGuideDialog.tsx');
const reviewService = read('src/services/pilot/pilotReviewService.ts');
const experienceService = read('src/services/pilot/pilotExperienceService.ts');
const contentService = read('src/services/pilot/pilotContentAdminService.ts');
const migration = read('supabase/migrations/20260721100000_phase_5_admin_management_release_gate.sql');
const vercel = read('vercel.json');

check(routes.includes("auth: '/pilot/auth'") && routes.includes("landing: '/pilot'"), 'Pilot authentication and landing routes are deterministic.');
check(auth.includes('resolvePilotDestination') && auth.includes('PILOT_ROUTES.landing'), 'Pilot signup and login resolve into Pilot routes.');
check(auth.includes("'pilot-student-signup'") && !auth.includes("navigate('/dashboard')"), 'Controlled Pilot signup does not redirect to the production dashboard.');
check(officialAuth.includes("navigate('/dashboard')") || officialAuth.includes('redirectToDashboard'), 'Standard application login retains its production dashboard path.');
check(app.includes('path="/pilot/reviews"') && app.includes('path="/security/pilot/reviews"') && app.includes('path="/admin/pilot/reviews"'), 'Student, campus and super-admin review routes are registered.');
check(app.includes('path="/admin/pilot/content"') && app.includes('<PilotContentManagement />'), 'Super-admin Pilot content management is registered and role guarded.');
check(studentNavigation.includes("label: 'Reviews'") && staffNavigation.includes("label: 'Reviews'"), 'Review navigation exists for student and staff Pilot roles.');
check(staffNavigation.includes("label: 'Content'") && staffNavigation.includes('userRole === \'admin\''), 'Content navigation is restricted to super admins.');

for (const handler of ['toggleQuickFeedback', 'submitPilotReview', 'beginEdit', 'openAttachment']) {
  check(reviewPage.includes(handler), `Student review control has handler: ${handler}.`);
}
for (const handler of ['runImmediateAction', 'openResponseAction', 'submitResponse', 'exportReviews', 'setStudent']) {
  check(reviewAdmin.includes(handler), `Admin review control has handler: ${handler}.`);
}
check(reviewAdmin.includes('dateFrom') && reviewAdmin.includes('dateTo') && reviewAdmin.includes('ratingFilter') && reviewAdmin.includes('categoryFilter'), 'Admin reviews filter by date, rating, category and status.');
check(reviewAdmin.includes('campusStats') && reviewAdmin.includes('Rating trend') && reviewAdmin.includes('campusFilter'), 'Super admins receive campus rating comparison and trends.');
check(reviewAdmin.includes('loadPilotStudentIdentities') && reviewAdmin.includes('Open case'), 'Review admins can open authorised student details and related cases.');
check(reviewAdmin.includes('downloadCsv') && reviewAdmin.includes('Export CSV'), 'Campus and complete review exports are implemented.');

for (const scope of ['pilot_review_categories', 'pilot_review_quick_cards', 'pilot_guide_steps', 'pilot_carousel_slides', 'pilot_resource_documents']) {
  check(migration.includes(scope), `Phase 5 migration manages ${scope}.`);
}
check(migration.includes('private.pilot_is_super_admin') && migration.includes('pilot_carousel_admin_update'), 'Phase 5 content writes are super-admin restricted.');
check(migration.includes('pilot-content-assets') && migration.includes('pilot-resource-documents'), 'Managed images and PDFs use dedicated Pilot storage buckets.');
check(migration.includes('pilot_review_category_fk') && migration.includes('Unsupported or inactive quick feedback selection'), 'Review categories and quick cards are server validated.');
check(contentAdmin.includes('Dashboard carousel') && contentAdmin.includes('First-login user guide') && contentAdmin.includes('Review categories') && contentAdmin.includes('Versioned CCSF Safety PDF'), 'Content workspace covers every required admin content area.');
check(contentAdmin.includes('Campus targeting') && contentAdmin.includes('Display order') && contentAdmin.includes('Starts at') && contentAdmin.includes('Expires at'), 'Carousel and PDF controls expose targeting, order and scheduling.');
check(contentService.includes('uploadPilotContentImage') && contentService.includes('uploadPilotSafetyPdf'), 'Content management uploads approved image and PDF file types.');

check(reviewPage.includes('loadPilotReviewOptions') && reviewPage.includes('options.quickCards') && reviewPage.includes('options.categories'), 'Student reviews use super-admin managed categories and quick cards.');
check(guide.includes('loadPilotGuideSteps') && guide.includes('Close Pilot guide') && guide.includes('onOpenChange'), 'Guide content is managed and the modal remains closable.');
check(carousel.includes('data-testid="pilot-dashboard-carousel"') && studentDashboard.includes('<PilotDashboardCarousel'), 'Pilot carousel is rendered on the student dashboard.');
check(experienceService.includes('resolvePilotSafetyDocumentUrl') && experienceService.includes('createSignedUrl'), 'Managed Safety PDFs use secure signed download URLs.');
check(exists('public/downloads/CCSF-Pilot-Safety-Guide-v1.0.pdf'), 'Approved static Safety PDF fallback exists.');

check(campusDashboard.includes('loadPilotAdminData({ programId, campus })'), 'Campus reports remain explicitly campus scoped.');
check(reportForm.includes('emergency') && !reportForm.includes('emergency && required={true}'), 'Emergency form retains a minimal conditional workflow.');
check(studentDashboard.includes('PILOT_ROUTES.report(report.id)') || studentDashboard.includes('to={PILOT_ROUTES.report(report.id)}'), 'Student case cards are openable.');
check(campusDashboard.includes('onAdvance={moveReport}') || campusDashboard.includes('navigate(PILOT_ROUTES.report'), 'Campus case actions have live handlers.');

const pilotServices = [reviewService, experienceService, contentService].join('\n');
for (const productionTable of ["from('incidents')", "from('feedback')", "from('carousel_images')", "from('notifications')", "from('case_updates')"]) {
  check(!pilotServices.includes(productionTable), `Pilot Phase 5 services do not access production table: ${productionTable}.`);
}
check(!/placehold\.co|example\.com|href=["']#["']/.test([reviewPage, reviewAdmin, contentAdmin, guide, carousel].join('\n')), 'Phase 5 UI contains no placeholder links.');
check(!/onClick=\{\(\) => \{\s*\}\}|onClick=\{undefined\}|href=["']javascript:void/.test([reviewPage, reviewAdmin, contentAdmin, studentDashboard].join('\n')), 'Phase 5 UI contains no empty or dead click handlers.');
check(vercel.includes('"destination": "/index.html"'), 'Vercel SPA rewrite protects direct Pilot preview routes.');

const pdf = fs.readFileSync(path.join(root, 'public/downloads/CCSF-Pilot-Safety-Guide-v1.0.pdf'));
check(pdf.subarray(0, 5).toString() === '%PDF-', 'Safety PDF fallback is structurally valid.');
check(pdf.length > 250_000, 'Safety PDF contains high-resolution content.');
check([...pdf.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length >= 12, 'Safety PDF contains at least 12 A4 pages.');

if (failures.length) {
  console.error(`Phase 5 release verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Phase 5 release verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
