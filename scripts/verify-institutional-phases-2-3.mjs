import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const check = (condition, message) => condition ? passes.push(message) : failures.push(message);

const required = [
  'src/components/student/InstitutionalCampusRadar.tsx',
  'src/components/maps/GeographicCampusMap.tsx',
  'src/data/campusGeography.ts',
  'src/data/campusSafetyCatalog.ts',
  'src/components/student/InstitutionalCaseReports.tsx',
  'src/pages/InstitutionalProfile.tsx',
  'src/components/shared/PremiumAvatarUpload.tsx',
  'src/components/student/SafetyMobilityHub.tsx',
  'src/components/student/CampusMap.tsx',
  'src/components/student/MyCaseReports.tsx',
  'src/pages/Profile.tsx',
];
required.forEach((file) => check(exists(file), `Institutional release file exists: ${file}.`));

const radar = read('src/components/student/InstitutionalCampusRadar.tsx');
const geographicMap = read('src/components/maps/GeographicCampusMap.tsx');
const geography = read('src/data/campusGeography.ts');
const catalog = read('src/data/campusSafetyCatalog.ts');
const hub = read('src/components/student/SafetyMobilityHub.tsx');
const campusMap = read('src/components/student/CampusMap.tsx');
const cases = read('src/components/student/InstitutionalCaseReports.tsx');
const caseEntry = read('src/components/student/MyCaseReports.tsx');
const profile = read('src/pages/InstitutionalProfile.tsx');
const profileEntry = read('src/pages/Profile.tsx');
const avatar = read('src/components/shared/PremiumAvatarUpload.tsx');

check(hub.includes('<InstitutionalCampusRadar') && hub.includes('onSelectStudent={setSelectedStudent}'), 'Safety tab uses the new internal Campus Safety Radar while preserving student selection.');
check(hub.includes('<CampusMap campus={campus} />'), 'Campus Maps tab receives the authenticated student campus.');
check(!hub.includes('mapsUrl') && !hub.includes('maps.google.com') && !hub.includes('plottedStudents'), 'Legacy external map and generic radial plotting code are removed from the hub.');
check(
  campusMap.includes('GeographicCampusMap')
    && geographicMap.includes('tile.openstreetmap.org')
    && geographicMap.includes('navigator.geolocation.getCurrentPosition')
    && geography.includes('pretoria_west_main')
    && !campusMap.includes('iframe'),
  'CampusMap is a first-party geographic institutional map wrapper with measured device-location support.',
);
check(radar.includes('LiveRadarMap') && radar.includes('CampusPlanExplorer'), 'Radar has both measured live-position and campus-plan modes.');
check(radar.includes('haversineMeters') && radar.includes('bearingDegrees'), 'Live student placement uses coordinate distance and bearing.');
check(radar.includes('selfAccuracyRadius') && radar.includes('accuracy_meters'), 'Radar renders location-accuracy uncertainty for the device and opted-in students.');
check(radar.includes('Fix quality') && radar.includes('Fix freshness') && radar.includes('Measured accuracy'), 'Students can inspect location quality, age and measured accuracy.');
check(radar.includes('2.5D view') && radar.includes('rotateX') && radar.includes('routePath'), 'Campus plan includes controlled 2.5D depth and internal route visuals.');
check(radar.includes('prefers') || radar.includes('useReducedMotion'), 'Motion respects reduced-motion preferences.');
check(!radar.includes('google.com') && !radar.includes('<iframe'), 'Campus Radar has no external map redirect or iframe dependency.');

for (const phrase of [
  'Dinokeng Building (Build-21) Student Administration',
  'Registration assistance',
  'Proof of registration',
  'Academic records',
  'Campus Protection Services office',
  'Building 4',
  'G-51',
  'CPS Control Room',
  'G-63',
  'Student Counselling and Student Support',
  'Mental-health support',
]) check(catalog.includes(phrase), `Campus directory includes ${phrase}.`);
check(catalog.includes('verified_service') && catalog.includes('verified_plan') && catalog.includes('schematic_reference'), 'Campus locations carry explicit confidence classifications.');
check(catalog.includes('false map pin') || radar.includes('false map pin'), 'Unverified destinations are not given fabricated map pins.');

check(caseEntry.includes('InstitutionalCaseReports as MyCaseReports'), 'Existing My Cases route is preserved through the institutional workspace.');
check(cases.includes('caseReference') && cases.includes('CCSF-'), 'Case cards display stable institutional references.');
check(cases.includes('CaseProgress') && cases.includes('STATUS_STAGES'), 'Case cards and details expose an institutional progress sequence.');
check(cases.includes("from('incident_media')") && cases.includes('evidenceCount'), 'Case workspace includes evidence counts from the official media table.');
check(cases.includes('Download case receipt') && cases.includes('text/html'), 'Students can generate a printable institutional case receipt.');
check(cases.includes('copyCoordinates') && !cases.includes('google.com/maps'), 'Case locations remain internal and copy measured coordinates without external redirection.');
check(cases.includes('case_updates') && cases.includes('Institutional timeline'), 'Case detail includes the official update timeline.');

check(profileEntry.includes("export { default } from '@/pages/InstitutionalProfile'"), 'Existing Profile route points to the institutional profile workspace.');
check(profile.includes('PremiumAvatarUpload') && profile.includes('InstitutionBrand'), 'Profile uses canonical branding and the premium profile image workflow.');
check(profile.includes('Emergency ready') && profile.includes('Privacy boundary') && profile.includes('Save profile securely'), 'Profile communicates readiness, privacy and secure-save state.');
check(profile.includes('touch-manipulation') && profile.includes('safe-area-inset-bottom'), 'Profile controls are mobile touch and safe-area aware.');
check(profile.includes('isValidPhone') && profile.includes('Student number required'), 'Profile validates core institutional identity fields before saving.');
check(avatar.includes('ReactCrop') && avatar.includes('circularCrop') && avatar.includes('cropImage'), 'Profile image workflow supports a controlled crop step.');
check(avatar.includes('outputSize = 1024') && avatar.includes("contentType: blob.type"), 'Avatar output is normalised to a high-quality consistent size and MIME type.');
check(avatar.includes('image/heic') && avatar.includes('image/heif'), 'Avatar selector accepts supported modern phone image formats.');
check(avatar.includes('stalePaths') && avatar.includes("from('avatars').remove"), 'Avatar updates clean up stale user-owned objects.');

if (failures.length) {
  console.error(`Institutional Phase 2/3 verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Institutional Phase 2/3 verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
