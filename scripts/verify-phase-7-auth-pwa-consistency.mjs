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
const pilotAuthView = read('src/components/pilot/PilotAuthInstitutionalView.tsx');
const officialRoutes = read('src/config/officialRoutes.ts');
const app = read('src/App.tsx');
const main = read('src/main.tsx');
const installPrompt = read('src/components/shared/PWAInstallPrompt.tsx');
const updatePrompt = read('src/components/shared/PWAUpdatePrompt.tsx');
const splash = read('src/components/shared/SplashScreen.tsx');
const mobileNav = read('src/components/shared/MobileBottomNav.tsx');
const navigation = read('src/components/shared/Navigation.tsx');
const pilotLayout = read('src/components/pilot/PilotInstitutionalLayout.tsx');
const dashboard = read('src/pages/Dashboard.tsx');
const serviceWorker = read('public/sw.js');
const indexHtml = read('index.html');
const manifest = parseJson('public/manifest.json');

assert(!authContext.includes('useNavigate') && !authContext.includes('useLocation'), 'AuthContext manages identity without hidden routing side effects.');
assert(authContext.includes('authError: string | null') && authContext.includes('refreshIdentity: () => Promise<void>'), 'Authentication exposes fail-closed recovery state.');
assert(authContext.includes('if (roleResponse.error) throw roleResponse.error') && authContext.includes('if (profileResponse.error) throw profileResponse.error'), 'Role and profile lookup failures are not silently ignored.');
assert(authContext.includes('This account does not have an authorised CCSF portal role'), 'Accounts without an authorised role fail closed with an institutional message.');
assert(protectedRoute.includes('<InstitutionalAccessError') && protectedRoute.includes('officialDefaultDestination'), 'Protected routes provide retry/sign-out recovery and deterministic role destinations.');
assert(officialRoutes.includes('normalizeRequestedOfficialPath') && officialRoutes.includes("candidate.startsWith('//')") && officialRoutes.includes("parsed.pathname.startsWith('/pilot')"), 'Official deep-link restoration rejects unsafe and Pilot destinations.');

assert(officialAuth.includes('<InstitutionalAuthFrame') && pilotAuthView.includes('<InstitutionalAuthFrame'), 'Official and Pilot authentication share one institutional frame.');
assert(officialAuth.includes("type AuthView = 'login' | 'signup' | 'forgot-password' | 'update-password'"), 'Official authentication supports login, signup, recovery and password update.');
assert(officialAuth.includes('supabase.auth.updateUser({ password })'), 'Password recovery includes the missing new-password completion step.');
assert(officialAuth.includes('PILOT_CAMPUS_VALUES') && officialAuth.includes('CAMPUS_LABELS'), 'Official signup uses the canonical campus register.');
assert(pilotAuth.includes("redirectTo: `${window.location.origin}/auth?reset=true`"), 'Pilot recovery completes through the same official password-update surface.');
assert(authFrame.includes('BRAND.productLongName') && authFrame.includes('BRAND.institutionName'), 'Authentication preserves the canonical CCSF/TUT hierarchy.');
assert(authFrame.includes('dark:bg-[#002F6C]/95') && pilotLayout.includes('dark:bg-[#002F6C]/95'), 'Authentication and Pilot shells retain explicit dark-mode hierarchy.');

assert(manifest.name === 'Campus Safety App — Campus Community Safety Forum', 'PWA manifest uses the approved Campus Safety App name.');
assert(manifest.short_name === 'Campus Safety App', 'PWA short name uses the approved Campus Safety App branding.');
assert(manifest.theme_color === '#002F6C' && manifest.background_color === '#FFFFFF', 'PWA uses institutional navy with a permanent white icon/startup background.');
assert(Array.isArray(manifest.icons) && manifest.icons.some((icon) => icon.src === '/maskable-icon-512.png' && icon.purpose === 'maskable'), 'PWA manifest includes the canonical opaque white maskable icon.');
assert(Array.isArray(manifest.icons) && manifest.icons.some((icon) => icon.src === '/app-icon-512.png' && icon.purpose === 'any'), 'PWA manifest includes the standard opaque white app icon.');
assert(Array.isArray(manifest.shortcuts) && manifest.shortcuts.some((shortcut) => shortcut.url === '/dashboard?tab=report'), 'PWA manifest provides the official report shortcut.');
assert(Array.isArray(manifest.shortcuts) && manifest.shortcuts.some((shortcut) => shortcut.url === '/dashboard?tab=safety'), 'PWA manifest provides the Safety Mobility shortcut.');
assert(!JSON.stringify(manifest).includes('#dc2626'), 'Legacy red PWA identity is removed.');
assert(indexHtml.includes('lang="en-ZA"') && indexHtml.includes('viewport-fit=cover'), 'HTML metadata supports South African locale and device safe areas.');
assert(indexHtml.includes('content="#002F6C"') && !indexHtml.includes('#dc2626'), 'HTML theme metadata uses institutional navy with no legacy red.');
assert(indexHtml.includes('og:image:alt') && indexHtml.includes('twitter:description'), 'Social metadata includes accessible and complete descriptions.');
assert(indexHtml.includes('/apple-touch-icon.png') && indexHtml.includes('/favicon-32x32.png') && indexHtml.includes('/favicon-16x16.png'), 'Browser and installation metadata use canonical native-size icons.');
assert(indexHtml.includes('Campus Safety App'), 'Browser metadata uses Campus Safety App instead of the retired product name.');

assert(serviceWorker.includes("const CACHE_VERSION = 'safety-mobility-2026-07-25-v2'"), 'Service worker uses the Safety Mobility cache namespace.');
assert(serviceWorker.includes("name.startsWith(`${CACHE_PREFIX}-`)") && serviceWorker.includes('caches.delete(name)'), 'Activation deletes every stale Campus Safety App cache generation.');
assert(!serviceWorker.includes('.then(() => self.skipWaiting())'), 'Service-worker installation no longer forces an uncontrolled refresh.');
assert(serviceWorker.includes("event.data?.type === 'SKIP_WAITING'") && serviceWorker.includes("event.data?.type === 'GET_VERSION'"), 'Service worker supports explicit update activation and version inspection.');
assert(serviceWorker.includes("cache: 'no-store'") && serviceWorker.includes('navigationPreload.enable'), 'Navigation uses network-first replacement with navigation preload.');
assert(!serviceWorker.includes('syncPendingIncidents') && !serviceWorker.includes("event.tag === 'sync-incidents'"), 'Unimplemented offline incident background-sync claims are removed.');
assert(serviceWorker.includes("icon: '/app-icon-192.png'") && serviceWorker.includes("badge: '/favicon-32x32.png'"), 'Push notifications use canonical native-size identity assets.');
assert(serviceWorker.includes('/campus-guides/pretoria-campus-structure-map.svg'), 'The traced Pretoria Campus structure reference is available offline without replacing live maps.');

assert(main.includes("updateViaCache: 'none'") && main.includes('registration.update()'), 'Application registration bypasses stale service-worker script caches and checks for updates.');
assert(main.includes('SERVICE_WORKER_UPDATE_INTERVAL') && main.includes("document.visibilityState === 'visible'"), 'PWA updates are checked periodically and when the application returns to view.');
assert(app.includes('<PWAInstallPrompt />') && app.includes('<PWAUpdatePrompt />'), 'Install and controlled update prompts are mounted globally.');
assert(updatePrompt.includes('registration.waiting.postMessage') && updatePrompt.includes('controllerchange'), 'Update prompt activates the waiting worker and reloads only after controller replacement.');
assert(installPrompt.includes("location.pathname === '/auth'") && installPrompt.includes("location.pathname === '/pilot/auth'"), 'Installation prompts do not obstruct authentication surfaces.');
assert(!installPrompt.includes('Works offline') && installPrompt.includes('controlled cache updates'), 'Install messaging accurately describes available PWA behavior.');

assert(!splash.includes('pixabay.com') && !splash.includes('AudioContext') && !splash.includes('Active Cameras') && !splash.includes('Response Time'), 'Splash screen contains no remote media, automatic audio or fabricated operational statistics.');
assert(splash.includes('useReducedMotion') && splash.includes('minDuration = 1200'), 'Splash duration is short and respects reduced-motion preferences.');
assert(splash.includes('<InstitutionBrand size="splash"') && splash.includes('BRAND.productLongName'), 'Splash uses the canonical CCSF/TUT hierarchy.');
assert(splash.includes('bg-white') && splash.includes('CAMPUS SAFETY APP'), 'Splash logo and product text use the approved Campus Safety App branding on a premium white panel.');

assert(!mobileNav.includes('maxItems = 5') && mobileNav.includes('overflow-x-auto'), 'Mobile navigation preserves every portal section instead of truncating after five.');
assert(mobileNav.includes('pb-[env(safe-area-inset-bottom)]') && mobileNav.includes('aria-current='), 'Mobile navigation supports device safe areas and active-page semantics.');
assert(navigation.includes("if (location.pathname !== '/') return null"), 'Floating public navigation no longer overlaps institutional portal headers.');
assert(pilotLayout.includes('BRAND.productLongName') && pilotLayout.includes('BRAND.institutionName'), 'Pilot header and footer use canonical institutional naming.');
assert(dashboard.includes('BRAND.productLongName') && dashboard.includes('BRAND.institutionName'), 'Student header and footer use canonical institutional naming.');
assert(dashboard.includes('userProfile') && !dashboard.includes("from('profiles')"), 'Student portal consumes the verified authentication profile instead of duplicating identity queries.');

for (const prohibited of ['#dc2626', 'my-ccsf-v1', 'my-ccsf-v2', 'syncPendingIncidents', 'cdn.pixabay.com']) {
  const combined = [indexHtml, JSON.stringify(manifest), serviceWorker, splash].join('\n');
  assert(!combined.includes(prohibited), `Phase 7 identity and PWA surfaces exclude legacy token: ${prohibited}.`);
}

if (failures.length) {
  console.error(`Phase 7 authentication, PWA and consistency verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Phase 7 authentication, PWA and consistency verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
