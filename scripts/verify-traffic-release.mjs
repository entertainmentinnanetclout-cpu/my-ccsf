import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const checks = [];

function requireText(file, fragments) {
  const source = read(file);
  for (const fragment of fragments) {
    checks.push({ file, fragment, passed: source.includes(fragment) });
  }
}

requireText('src/App.tsx', [
  "import Traffic from './pages/Traffic'",
  '<Route path="/traffic" element={<Traffic />} />',
]);
requireText('src/pages/Traffic.tsx', [
  'data-testid="ready-traffic"',
  '<VisitorParkingBooking />',
  '<RoadSafetyNotices />',
  'Official circular permit artwork is being onboarded',
]);
requireText('src/pages/Dashboard.tsx', [
  "import { StudentTrafficHub } from '@/components/student/StudentTrafficHub'",
  'STUDENT_VIEWS.add(TRAFFIC_STUDENT_VIEW)',
  '<StudentTrafficHub />',
]);
requireText('src/pages/Admin.tsx', [
  "import { TrafficOperations } from '@/components/admin/TrafficOperations'",
  '<TrafficOperations />',
]);
requireText('src/pages/Security.tsx', [
  "import { TrafficOperations } from '@/components/admin/TrafficOperations'",
  '<TrafficOperations campus={userProfile?.campus as CampusLocation | undefined} />',
]);
requireText('src/components/traffic/VisitorParkingBooking.tsx', [
  'createVisitorParkingRequest',
  'trackVisitorParkingRequest',
  'Submitting does not grant entry',
  'data-testid="traffic-visitor-booking"',
]);
requireText('src/components/student/StudentTrafficHub.tsx', [
  'Students may park only in marked student parking',
  'requestStudentTrafficPermit',
  'data-testid="student-traffic-hub"',
]);
requireText('src/components/admin/TrafficOperations.tsx', [
  'updateVisitorPassStatus',
  'updateStudentPermitStatus',
  'uploadTrafficPermitTemplate',
  'capture="environment"',
  'data-testid="traffic-operations"',
]);
requireText('src/services/trafficService.ts', [
  "supabase.rpc('traffic_create_visitor_pass'",
  "supabase.rpc('traffic_track_visitor_pass'",
  "supabase.rpc('traffic_request_student_permit'",
  "supabase.rpc('traffic_update_visitor_pass_status'",
  "supabase.rpc('traffic_update_student_permit_status'",
  '.from(TRAFFIC_TEMPLATE_BUCKET)',
]);
requireText('supabase/migrations/20260824120000_traffic_department.sql', [
  'create table public.traffic_visitor_passes',
  'create table public.traffic_student_permits',
  'create table public.traffic_permit_templates',
  'create table public.traffic_gate_events',
  'create table public.traffic_road_safety_notices',
  'alter table public.traffic_visitor_passes enable row level security',
  'revoke all on public.traffic_visitor_passes from anon, authenticated',
  'create or replace function public.traffic_create_visitor_pass',
  'create or replace function public.traffic_track_visitor_pass',
  'create or replace function public.traffic_request_student_permit',
  'create or replace function public.traffic_update_visitor_pass_status',
  'create or replace function public.traffic_update_student_permit_status',
  "'traffic-permit-templates'",
  'owner_id = (select auth.uid())::text',
]);

const failures = checks.filter((check) => !check.passed);
if (failures.length > 0) {
  console.error('Traffic release gate failed:');
  for (const failure of failures) {
    console.error('- ' + failure.file + ' is missing: ' + failure.fragment);
  }
  process.exit(1);
}

console.log('Traffic release gate passed (' + checks.length + ' assertions).');
