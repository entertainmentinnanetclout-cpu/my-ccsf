import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

function requireText(content, expected, label) {
  if (!content.includes(expected)) failures.push(label);
}

const [productionDashboard, pilotDashboard, sharedHome, carousel, migration] = await Promise.all([
  read('src/pages/Dashboard.tsx'),
  read('src/components/pilot/PilotStudentDashboard.tsx'),
  read('src/components/student/StudentDashboardHome.tsx'),
  read('src/components/student/CampusCarousel.tsx'),
  read('supabase/migrations/20260719180500_repair_student_carousel_sources.sql'),
]);

requireText(productionDashboard, '<StudentDashboardHome campus={campus || undefined} />', 'Production student dashboard does not use the shared home with the verified AuthContext campus.');
requireText(productionDashboard, 'const { userProfile, signOut } = useAuth();', 'Production student dashboard does not consume the verified authentication profile.');
requireText(pilotDashboard, '<StudentDashboardHome campus={participant.campus} />', 'Pilot student dashboard does not use the shared home.');
requireText(sharedHome, '<CampusCarousel campus={campus} />', 'Shared student home is missing the campus carousel.');
requireText(sharedHome, '<NewsFeed />', 'Shared student home is missing the news feed.');
requireText(sharedHome, "eq('key', 'welcome_banner_text')", 'Shared student home is missing the configurable welcome banner.');
requireText(carousel, "image: '/og-image.png'", 'Campus carousel has no deployable institutional fallback.');
requireText(carousel, ".in('campus', [campus, 'all'])", 'Campus carousel does not use the safely encoded campus filter.');
requireText(migration, 'carousel_images_use_deployable_urls', 'Carousel migration does not prevent source-tree image paths.');

if (productionDashboard.includes("from('profiles')")) {
  failures.push('Production student dashboard duplicates the verified authentication-profile query.');
}

if (carousel.includes('placehold.co')) {
  failures.push('Campus carousel still depends on an external placeholder image.');
}

if (failures.length > 0) {
  console.error('Student home parity verification failed:\n' + failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log('Student home parity verification passed for production and Pilot dashboards.');
