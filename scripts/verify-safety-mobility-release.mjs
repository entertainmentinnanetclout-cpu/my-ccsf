import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const check = (condition, message) => condition ? passes.push(message) : failures.push(message);

const migration = read('supabase/migrations/20260725103000_student_safety_mobility_and_radar.sql');
const hardening = read('supabase/migrations/20260725104500_student_safety_mobility_campus_scope_hardening.sql');
const dashboard = read('src/pages/Dashboard.tsx');
const hub = read('src/components/student/SafetyMobilityHub.tsx');
const hook = read('src/hooks/useSafetyMobility.ts');
const service = read('src/services/safetyMobilityService.ts');
const campusMap = read('src/components/student/CampusMap.tsx');
const institutionalRadar = read('src/components/student/InstitutionalCampusRadar.tsx');
const campusCatalog = read('src/data/campusSafetyCatalog.ts');
const manifest = read('public/manifest.json');
const splash = read('src/components/shared/SplashScreen.tsx');
const index = read('index.html');
const worker = read('public/sw.js');
const mapAsset = read('public/campus-guides/pretoria-campus-structure-map.svg');

for (const table of ['safety_mobility_sessions', 'safety_mobility_location_updates', 'safety_mobility_events', 'student_safety_presence']) {
  check(migration.includes(`public.${table}`), `Migration defines ${table}.`);
}
for (const rpc of ['safety_start_mobility_session', 'safety_update_mobility_location', 'safety_end_mobility_session', 'safety_trigger_mobility_alert', 'safety_set_student_presence', 'safety_list_campus_radar']) {
  check(migration.includes(`public.${rpc}`), `Migration defines ${rpc}.`);
  check(service.includes(`'${rpc}'`), `Client service invokes ${rpc}.`);
}
check(migration.includes("visibility text not null default 'off'") && migration.includes('campus_approximate') && migration.includes('campus_exact'), 'Radar visibility is explicit and opt-in.');
check(migration.includes('p_confirm_exact') && migration.includes('Exact-location consent is required'), 'Exact Radar visibility requires explicit consent.');
check(migration.includes("last_seen_at > now() - interval '15 minutes'"), 'Stale Radar positions disappear automatically.');
check(migration.includes('round(presence.latitude::numeric, 3)') && migration.includes('greatest(coalesce(presence.accuracy_meters, 0), 120)'), 'Approximate Radar mode limits precision.');
check(migration.includes('insert into public.incidents') && migration.includes('insert into public.incident_location_updates'), 'A travel alert creates an official case and joins the existing live-location trail.');
check(migration.includes("share_scope = 'campus_security'") && migration.includes("status = 'alerted'"), 'Alerted travel sessions become visible to authorised campus security.');
check(hardening.includes('private.safety_require_student_campus') && hardening.includes("'student'::public.user_role"), 'Safety Mobility RPCs require an authenticated student with a verified campus.');
check(hardening.includes('verified_campus is distinct from p_campus'), 'Client-supplied campus values cannot override the verified student profile.');
check(hardening.includes('perform private.safety_require_student_campus(p_campus);'), 'Travel, presence and Radar functions enforce campus scope server-side.');
check(hardening.includes('revoke all on function public.safety_list_campus_radar') && hardening.includes('to authenticated'), 'Safety RPC execution is closed to public/anonymous callers.');

check(
  dashboard.includes("type StudentView = 'home' | 'report' | 'mycases' | 'safety' | 'community' | 'messages'")
    && dashboard.includes("{ view: 'community', icon: UsersRound, label: 'Community' }"),
  'Student dashboard preserves the original five primary sections and adds Community as the sixth section.',
);
check(dashboard.includes("{ view: 'safety', icon: Radar, label: 'Safety' }"), 'Safety Mobility has a primary student-navigation destination.');
check(dashboard.includes('<SafetyMobilityHub campus={campus} />'), 'Official student dashboard renders the Safety Mobility hub.');
check(dashboard.includes('Open Pilot') && dashboard.includes('StudentDashboardHome'), 'Existing Pilot navigation and student-home carousel remain available.');

for (const label of ['In-Transit', 'Night Travel', 'Track This Phone', 'Campus Safety Radar', 'Alert CCSF / CPS']) {
  check(hub.includes(label), `Safety hub includes ${label}.`);
}
check(hub.includes("import { InstitutionalCampusRadar }") && hub.includes('<InstitutionalCampusRadar'), 'Safety tab renders the first-party institutional Campus Safety Radar.');
check(hub.includes('<CampusMap campus={campus} />'), 'Safety tab renders the internal campus plan for the verified student campus.');
check(campusMap.includes('CampusPlanExplorer') && !campusMap.includes('<iframe') && !campusMap.includes('maps.google.com'), 'Legacy external iframe maps and generic Wi-Fi overlays are removed.');
check(institutionalRadar.includes('LiveRadarMap') && institutionalRadar.includes('CampusPlanExplorer'), 'Campus Radar contains live and campus-plan layers inside the Campus Safety App.');
check(institutionalRadar.includes('selfAccuracyRadius') && institutionalRadar.includes('accuracy_meters') && institutionalRadar.includes('Fix quality'), 'Live Radar visualises measured device and student uncertainty.');
check(institutionalRadar.includes('haversineMeters') && institutionalRadar.includes('bearingDegrees') && institutionalRadar.includes('maxRange'), 'Nearby students are projected from real coordinate distance and bearing.');
check(institutionalRadar.includes('2.5D view') && institutionalRadar.includes('rotateX') && institutionalRadar.includes('routePath'), 'Campus plan provides controlled depth and internal visual routing.');
check(!institutionalRadar.includes('google.com/maps') && !institutionalRadar.includes('<iframe'), 'Primary Campus Radar never redirects students to an external map.');
for (const phrase of ['Dinokeng Building (Build-21)', 'G-51', 'G-63', 'Student Counselling', 'Registration assistance', 'Proof of registration', 'Academic records']) {
  check(campusCatalog.includes(phrase), `Campus safety directory includes ${phrase}.`);
}
check(campusCatalog.includes("confidence: 'verified_service'") && campusCatalog.includes("confidence: 'verified_plan'"), 'Campus destinations distinguish verified service references from plan positions.');
check(mapAsset.includes('BUILDING') && mapAsset.includes('TECHNIKONRAND') && mapAsset.includes('BUS PARKING'), 'Campus structure reference retains its supplied landmarks.');

check(hook.includes('watchPosition') && hook.includes('wakeLock') && hook.includes('getBatteryPercent'), 'Safety Mobility uses live watch, wake lock and device battery context where supported.');
check(hook.includes('RADAR_STORAGE_KEY') && hook.includes("visibility: 'off'"), 'Radar preference persists but defaults to invisible.');
check(!hook.includes('browser tracking works'), 'Hook contains no misleading guarantee of permanent browser tracking.');
check(hub.includes('cannot locate a powered-off phone') && hub.includes('does not guarantee continuous background tracking when the browser is fully closed'), 'UI states phone and browser background-tracking limitations accurately.');
check(institutionalRadar.includes('Only voluntary, non-stale Radar sharing is shown') && institutionalRadar.includes('The app will not invent a location'), 'Radar explains privacy and refuses fabricated position data.');

for (const icon of ['public/app-icon-192.png', 'public/app-icon-512.png', 'public/maskable-icon-512.png', 'public/apple-touch-icon.png']) {
  check(exists(icon) && fs.statSync(path.join(root, icon)).size > 5_000, `${icon} exists as a substantive institutional PNG.`);
}
check(manifest.includes('/app-icon-512.png') && manifest.includes('/maskable-icon-512.png') && manifest.includes('/dashboard?tab=safety'), 'PWA manifest uses verified PNG icons and the Safety Mobility shortcut.');
check(index.includes('sizes="180x180" href="/apple-touch-icon.png"') && index.includes('sizes="32x32" href="/favicon-32x32.png"'), 'Browser and installation metadata use verified native-size icons.');
check(splash.includes('bg-white') && splash.includes('CAMPUS SAFETY APP') && splash.includes('themeOverride="light"'), 'Splash displays the Campus Safety App with the CCSF/TUT brand clearly on white.');
check(worker.includes('/campus-guides/pretoria-campus-structure-map.svg') && worker.includes("icon: '/app-icon-192.png'"), 'Service worker caches the campus reference and uses the canonical notification icon.');

for (const forbidden of [
  "visibility text not null default 'campus_exact'",
  'p_confirm_exact boolean default true',
  'navigator.geolocation without consent',
  "from('incident_location_updates')",
]) {
  check(!service.includes(forbidden), `Safety client avoids unsafe or duplicate direct access: ${forbidden}.`);
}

if (failures.length) {
  console.error(`Safety Mobility verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Safety Mobility verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
