import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const requireText = (source, expected, label) => {
  if (!source.includes(expected)) throw new Error(`Phase 3 review verification failed: ${label}`);
};
const forbidText = (source, forbidden, label) => {
  if (source.includes(forbidden)) throw new Error(`Phase 3 review verification failed: ${label}`);
};

const migration = read('supabase/migrations/20260720213000_phase_3_pilot_reviews.sql');
const phase5Migration = read('supabase/migrations/20260721100000_phase_5_admin_management_release_gate.sql');
const service = read('src/services/pilot/pilotReviewService.ts');
const reviewTypes = read('src/types/pilotReviews.ts');
const studentPage = read('src/pages/pilot/PilotReviews.tsx');
const staffPage = read('src/pages/pilot/PilotReviewManagement.tsx');
const studentNav = read('src/components/pilot/PilotStudentNavigation.tsx');
const staffNav = read('src/components/pilot/PilotStaffNavigation.tsx');
const routes = read('src/config/pilotRoutes.ts');
const app = read('src/App.tsx');

requireText(migration, 'create table if not exists public.pilot_reviews', 'The isolated pilot_reviews table must exist.');
requireText(migration, "create type public.pilot_review_status as enum ('submitted', 'under_review', 'responded', 'resolved', 'hidden', 'flagged')", 'Every approved review status must be represented.');
requireText(migration, 'private.pilot_can_access_review', 'Review visibility must be enforced server-side.');
requireText(migration, 'private.pilot_can_manage_review', 'Campus and super-admin moderation must be server-authorised.');
requireText(migration, 'public.pilot_submit_review', 'Review ownership and campus must be derived by an authenticated RPC.');
requireText(migration, 'Review submission rate limit reached', 'Review submissions must be rate-limited.');
requireText(migration, 'public.pilot_moderate_review', 'Admin moderation must use an authenticated RPC.');
requireText(migration, "'pilot_review_moderated'", 'Moderation actions must be written to Pilot audit logs.');
requireText(migration, "'pilot-review-attachments'", 'Review screenshots must use a dedicated private bucket.');
requireText(migration, 'private.pilot_review_program_is_open', 'Campus review access must require an active eligible Pilot programme.');
requireText(migration, 'revoke insert, update, delete on public.pilot_reviews from anon, authenticated', 'Direct client review writes must be blocked.');
requireText(migration, 'alter publication supabase_realtime add table public.pilot_reviews', 'Review changes must support realtime delivery.');
requireText(phase5Migration, 'pilot_review_categories', 'Phase 5 must retain data-driven review categories.');
requireText(phase5Migration, 'pilot_review_quick_cards', 'Phase 5 must retain managed quick-review cards.');

requireText(service, "rpc('pilot_submit_review'", 'Student reviews must use the server submission RPC.');
requireText(service, "rpc('pilot_moderate_review'", 'Staff moderation must use the server moderation RPC.');
requireText(service, 'storage.from(PILOT_REVIEW_ATTACHMENT_BUCKET)', 'Screenshots must use private Supabase Storage.');
requireText(service, 'loadPilotReviewOptions', 'Review options must load from the controlled Pilot configuration.');
forbidText(service, ".from('feedback')", 'Pilot reviews must not use production feedback tables.');
forbidText(service, ".from('incidents')", 'Pilot reviews must not read production incidents.');

for (const label of [
  'Easy to use',
  'Location worked correctly',
  'Reporting was clear',
  'Case updates were useful',
  'Navigation was confusing',
  'Location was inaccurate',
  'App was slow',
  'I found a broken feature',
  'Other feedback',
]) requireText(reviewTypes, label, `Controlled quick review default missing: ${label}`);
requireText(studentPage, 'options.quickCards', 'Students must receive managed quick-review cards.');
requireText(studentPage, 'Overall rating', 'Students must be able to submit a 1–5 star rating.');
requireText(studentPage, 'Related case (optional)', 'Students must be able to relate a review to a Pilot case.');
requireText(studentPage, 'Permission to contact me', 'Contact permission must be explicit.');
requireText(studentPage, 'Your previous reviews', 'Students must be able to view prior reviews.');
requireText(studentPage, 'Authorised staff response', 'Students must be able to read staff replies.');
requireText(studentPage, 'EDITABLE_PILOT_REVIEW_STATUSES', 'Unresolved reviews must remain editable.');

requireText(staffPage, 'Pilot Review Management', 'Campus and super-admin review management must exist.');
requireText(staffPage, 'moderatePilotReview(', 'Moderation controls must call the authorised service.');
requireText(staffPage, 'Campus-scoped review moderation', 'Campus scope must be clear to campus staff.');
requireText(staffPage, 'Cross-campus review oversight', 'Super-admin oversight must be explicit.');
requireText(staffPage, 'Respond', 'Staff must be able to reply to reviews.');
requireText(staffPage, 'Resolve', 'Staff must be able to resolve reviews.');
requireText(staffPage, 'Flag', 'Staff must be able to flag reviews.');
requireText(staffPage, 'Hide', 'Staff must be able to hide reviews.');

requireText(studentNav, "label: 'Reviews'", 'The student Pilot navigation must include Reviews.');
requireText(staffNav, "label: 'Reviews'", 'The staff Pilot navigation must include Reviews.');
requireText(routes, "reviews: '/pilot/reviews'", 'The student review route must be approved.');
requireText(routes, "campusReviews: '/security/pilot/reviews'", 'The campus review route must be approved.');
requireText(routes, "adminReviews: '/admin/pilot/reviews'", 'The super-admin review route must be approved.');
requireText(app, '<PilotReviews />', 'The student review page must be routed.');
requireText(app, '<PilotReviewManagement />', 'The staff review workspace must be routed.');

console.log('Phase 3 Pilot reviews verification passed with Phase 5 managed options.');
