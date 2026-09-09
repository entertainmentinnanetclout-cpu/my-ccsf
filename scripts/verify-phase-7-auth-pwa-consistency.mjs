import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const parseJson = (relativePath) => JSON.parse(read(relativePath));
const assert = (condition, message) => condition ? passes.push(message) : failures.push(message);

const authContext = read('src/contexts/AuthContext.tsx');
const protectedRoute = read('src/components/ProtectedRoute.tsx');
const officialAuth = read('src/pages/Auth.tsx');
const pilotAuth = read('src/pages/pilot/PilotAuth.tsx');
const authFrame = read('src/components/auth/InstitutionalAuthFrame.tsx');
const officialRoutes = read('src/config/officialRoutes.ts');
const app = read('src/App.tsx');
const main = read('src/main.tsx');
const installPrompt = read('src/components/shared/PWAInstallPrompt.tsx');
const updatePrompt = read('src/components/shared/PWAUpdatePrompt.tsx');
const splash = read('src/components/shared/SplashScreen.tsx');
const mobileNav = read('src/components/shared/MobileBottomNav.tsx');
const navigation = read('src/components/shared/Navigation.tsx');
const serviceWorker = read('public/sw.js');
const indexHtml = read('index.html');
const manifest = parseJson('public/manifest.json');

assert(!authContext.includes('useNavigate') && !authContext.includes('useLocation'), 'AuthContext manages identity without hidden routing side effects.');
assert(authContext.includes('authError: string | null') && authContext.includes('refreshIdentity: () => Promise<void>'), 'Authentication exposes fail-closed recovery state.');
assert(protectedRoute.includes('<InstitutionalAccessError') && protectedRoute.includes('officialDefaultDestination'), 'Protected routes provide deterministic recovery and role destinations.');
assert(officialRoutes.includes('normalizeRequestedOfficialPath') && officialRoutes.includes("candidate.startsWith('//')") && officialRoutes.includes("parsed.pathname.startsWith('/pilot')"), 'Official deep-link restoration rejects unsafe and Pilot destinations.');
assert(officialAuth.includes("type AuthView = 'login' | 'signup' | 'forgot-password' | 'update-password'"), 'Official authentication supports login, signup and password recovery.');
assert(officialAuth.includes('PILOT_CAMPUS_VALUES') && officialAuth.includes('CAMPUS_LABELS'), 'Official signup uses the canonical campus register.');
assert(pilotAuth.includes("redirectTo: `${window.location.origin}/auth?reset=true`"), 'Pilot recovery completes through the official password-update surface.');
assert(authFrame.includes('BRAND.productLongName') && authFrame.includes('BRAND.institutionName'), 'Authentication keeps product naming separate from the TUT institutional identity.');

assert(manifest.name === 'Campus Safety App — Tshwane University of Technology', 'PWA manifest uses the TUT-only institutional name.');
assert(manifest.short_name === 'Campus Safety App', 'PWA short name remains Campus Safety App.');
assert(manifest.theme_color === '#002F6C' && manifest.background_color === '#FFFFFF', 'PWA retains institutional navy and white surfaces.');
assert(Array.isArray(manifest.icons) && manifest.icons.some((icon) => icon.src === '/maskable-icon-512.png' && icon.purpose === 'maskable'), 'PWA manifest includes a maskable TUT icon asset.');
assert(Array.isArray(manifest.icons) && manifest.icons.some((icon) => icon.src === '/app-icon-512.png' && icon.purpose === 'any'), 'PWA manifest includes a standard TUT icon asset.');
assert(Array.isArray(manifest.shortcuts) && manifest.shortcuts.some((shortcut) => shortcut.url === '/dashboard?tab=report'), 'PWA manifest provides the report shortcut.');
assert(Array.isArray(manifest.shortcuts) && manifest.shortcuts.some((shortcut) => shortcut.url === '/dashboard?tab=safety'), 'PWA manifest provides the Safety Mobility shortcut.');
assert(!/Campus Community Safety Forum|Campus Protection Services/i.test(JSON.stringify(manifest)), 'PWA metadata contains no prohibited department/project co-branding.');
assert(indexHtml.includes('Tshwane University of Technology') && !/Campus Community Safety Forum|Campus Protection Services/i.test(indexHtml), 'Browser and social metadata are TUT-only.');
assert(indexHtml.includes('/apple-touch-icon.png') && indexHtml.includes('/favicon-32x32.png') && indexHtml.includes('/favicon-16x16.png'), 'Browser and installation metadata use native-size icon assets.');

assert(serviceWorker.includes("const CACHE_VERSION = 'tut-ci-release-2026-09-09-v1'"), 'Service worker forces replacement of the pre-CI-cleanup cache generation.');
assert(serviceWorker.includes("name.startsWith(`${CACHE_PREFIX}-`)") && serviceWorker.includes('caches.delete(name)'), 'Activation deletes stale Campus Safety App cache generations.');
assert(serviceWorker.includes("event.data?.type === 'SKIP_WAITING'") && serviceWorker.includes("event.data?.type === 'GET_VERSION'"), 'Service worker supports controlled update activation and version inspection.');
assert(serviceWorker.includes("cache: 'no-store'") && serviceWorker.includes('navigationPreload.enable'), 'Navigation remains network-first with navigation preload.');
assert(serviceWorker.includes("icon: '/app-icon-192.png'") && serviceWorker.includes("badge: '/favicon-32x32.png'"), 'Push notifications use generated TUT identity assets.');
assert(serviceWorker.includes("title: 'Campus Safety Alert'") && !serviceWorker.includes("title: 'My CCSF Alert'"), 'Push notification presentation no longer uses a CCSF sub-brand.');

assert(main.includes("updateViaCache: 'none'") && main.includes('registration.update()'), 'Application registration bypasses stale service-worker script caches and checks for updates.');
assert(app.includes('<PWAInstallPrompt />') && app.includes('<PWAUpdatePrompt />'), 'Install and controlled update prompts are mounted globally.');
assert(updatePrompt.includes('registration.waiting.postMessage') && updatePrompt.includes('controllerchange'), 'Update prompt activates the waiting worker safely.');
assert(installPrompt.includes("location.pathname === '/auth'") && installPrompt.includes("location.pathname === '/pilot/auth'"), 'Installation prompts do not obstruct authentication surfaces.');
assert(installPrompt.includes('TUT identity') && !/CCSF identity|official CCSF application/i.test(installPrompt), 'Install prompt presents only the TUT institutional identity.');
assert(splash.includes('<InstitutionBrand size="splash"') && splash.includes('BRAND.productLongName'), 'Splash keeps product text separate from the shared institutional logo component.');
assert(!mobileNav.includes('maxItems = 5') && mobileNav.includes('overflow-x-auto'), 'Mobile navigation preserves every portal section.');
assert(navigation.includes("if (location.pathname !== '/') return null"), 'Floating public navigation does not overlap portal headers.');

for (const prohibited of ['#dc2626', 'my-ccsf-v1', 'my-ccsf-v2', 'syncPendingIncidents', 'cdn.pixabay.com']) {
  const combined = [indexHtml, JSON.stringify(manifest), serviceWorker, splash].join('\n');
  assert(!combined.includes(prohibited), `Phase 7 surfaces exclude legacy token: ${prohibited}.`);
}

if (failures.length) {
  console.error(`Phase 7 authentication, PWA and consistency verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Phase 7 authentication, PWA and consistency verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
