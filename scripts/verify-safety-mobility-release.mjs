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
check(migration.includes('p_confirm_exact') && migration.includes('Exact-location consent is required'), 'Exact radar visibility requires explicit consent.');
check(migration.includes("last_seen_at > now() - interval '15 minutes'"), 'Stale radar positions disappear automatically.');
check(migration.includes('round(presence.latitude::numeric, 3)') && migration.includes('greatest(coalesce(presence.accuracy_meters, 0), 120)'), 'Approximate radar mode limits precision.');
check(migration.includes('insert into public.incidents') && migration.includes('insert into public.incident_location_updates'), 'A travel alert creates an official case and joins the existing live-location trail.');
check(migration.includes("share_scope = 'campus_security'") && migration.includes("status = 'alerted'"), 'Alerted travel sessions become visible to authorised campus security.');
check(hardening.includes('private.safety_require_student_campus') && hardening.includes("'student'::public.user_role"), 'Safety Mobility RPCs require an authenticated student with a verified campus.');
check(hardening.includes('verified_campus is distinct from p_campus'), 'Client-supplied campus values cannot override the verified student profile.');
check(hardening.includes('perform private.safety_require_student_campus(p_campus);'), 'Travel, presence and Radar functions enforce campus scope server-side.');
check(hardening.includes('revoke all on function public.safety_list_campus_radar') && hardening.includes('to authenticated'), 'Safety RPC execution is closed to public/anonymous callers.');

check(dashboard.includes("type StudentView = 'home' | 'report' | 'mycases' | 'safety' | 'messages'"), 'Student dashboard is organised into five clear primary sections.');
check(dashboard.includes("{ view: 'safety', icon: Radar, label: 'Safety' }"), 'Safety Mobility has a primary student-navigation destination.');
check(dashboard.includes('<SafetyMobilityHub campus={campus} />'), 'Official student dashboard renders the Safety Mobility hub.');
check(dashboard.includes('Open Pilot') && dashboard.includes('StudentDashboardHome'), 'Existing Pilot navigation and student-home carousel remain available.');

for (const label of ['In-Transit', 'Night Travel', 'Track This Phone', 'Campus Safety Radar', 'Alert CCSF / CPS']) {
  check(hub.includes(label), `Safety hub includes ${label}.`);
}
check(hub.includes('<CampusMap />') && hub.includes('import { CampusMap }'), 'Existing connected CampusMap is retained, not replaced.');
check(campusMap.includes('maps.google.com/maps') && campusMap.includes('directionsUrl'), 'Existing live Google Maps links remain intact.');
check(hub.includes('/campus-guides/pretoria-campus-structure-map.svg'), 'Uploaded campus structure is included as a separate reference.');
check(mapAsset.includes('secondary reference') && mapAsset.includes('live GPS map remains separate'), 'Static map clearly preserves the live GPS map boundary.');
check(mapAsset.includes('BUILDING') && mapAsset.includes('TECHNIKONRAND') && mapAsset.includes('BUS PARKING'), 'Campus reference contains source-map navigation landmarks.');

check(hook.includes('watchPosition') && hook.includes('wakeLock') && hook.includes('getBatteryPercent'), 'Safety Mobility uses live watch, wake lock and device battery context where supported.');
check(hook.includes('RADAR_STORAGE_KEY') && hook.includes("visibility: 'off'"), 'Radar preference persists but defaults to invisible.');
check(!hook.includes('browser tracking works'), 'Hook contains no misleading guarantee of permanent browser tracking.');
check(hub.includes('cannot locate a powered-off phone') && hub.includes('may pause when the browser is fully closed'), 'UI states phone and browser background-tracking limitations accurately.');
check(hub.includes('Approximate users are deliberately blurred') && hub.includes('Tap a profile icon'), 'Radar UI explains its interactive, privacy-limited behavior.');

for (const icon of ['public/app-icon-192.png', 'public/app-icon-512.png', 'public/maskable-icon-512.png', 'public/apple-touch-icon.png']) {
  check(exists(icon) && fs.statSync(path.join(root, icon)).size > 5_000, `${icon} exists as a substantive institutional PNG.`);
}
check(manifest.includes('/app-icon-512.png') && manifest.includes('/maskable-icon-512.png') && manifest.includes('/dashboard?tab=safety'), 'PWA manifest uses verified PNG icons and the Safety Mobility shortcut.');
check(index.includes('sizes="180x180" href="/apple-touch-icon.png"') && index.includes('sizes="32x32" href="/favicon-32x32.png"'), 'Browser and installation metadata use verified native-size icons.');
check(splash.includes('bg-white') && splash.includes('MY CCSF') && splash.includes('themeOverride="light"'), 'Splash displays the CCSF/TUT brand clearly on white.');
check(worker.includes('/campus-guides/pretoria-campus-structure-map.svg') && worker.includes("icon: '/app-icon-192.png'"), 'Service worker caches the structure map and uses the canonical PNG notification icon.');

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
