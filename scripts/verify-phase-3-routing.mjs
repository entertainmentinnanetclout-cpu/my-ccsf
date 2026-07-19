import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const failures = [];
const passes = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (condition) passes.push(message);
  else failures.push(message);
}

const routeSource = read('src/config/pilotRoutes.ts');
const compiledRoutes = ts.transpileModule(routeSource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const routes = await import(`data:text/javascript;base64,${Buffer.from(compiledRoutes).toString('base64')}`);

const expectedDefaults = {
  student: '/pilot',
  security: '/security/pilot',
  admin: '/admin/pilot',
};

for (const [role, destination] of Object.entries(expectedDefaults)) {
  assert(routes.pilotDefaultDestination(role) === destination, `${role} has the correct Pilot default destination.`);
}

const preservedPaths = [
  ['student', '/pilot?tab=home', '/pilot?tab=home'],
  ['student', '/pilot/session/session-id?step=evidence#upload', '/pilot/session/session-id?step=evidence#upload'],
  ['student', '/pilot/report/report-id?view=timeline#latest', '/pilot/report/report-id?view=timeline#latest'],
  ['student', '/pilot/resources?format=print', '/pilot/resources?format=print'],
  ['security', '/security/pilot?queue=open', '/security/pilot?queue=open'],
  ['admin', '/admin/pilot?tab=audit', '/admin/pilot?tab=audit'],
  ['admin', '/security/pilot?campus=mbombela', '/security/pilot?campus=mbombela'],
];

for (const [role, requested, expected] of preservedPaths) {
  assert(
    routes.resolvePilotDestination(role, requested) === expected,
    `${role} preserves the approved deep link ${requested}.`,
  );
}

const deniedPaths = [
  ['student', '/security/pilot', '/pilot'],
  ['student', '/admin/pilot', '/pilot'],
  ['security', '/pilot/report/report-id', '/security/pilot'],
  ['security', '/admin/pilot', '/security/pilot'],
  ['admin', '/pilot/report/report-id', '/admin/pilot'],
  ['student', '/pilot/auth', '/pilot'],
  ['student', '/pilot/unknown', '/pilot'],
  ['student', 'https://evil.example/pilot', '/pilot'],
  ['student', '//evil.example/pilot', '/pilot'],
  ['student', '/pilot\\report\\report-id', '/pilot'],
];

for (const [role, requested, expected] of deniedPaths) {
  assert(
    routes.resolvePilotDestination(role, requested) === expected,
    `${role} safely rejects ${requested}.`,
  );
}

assert(
  routes.resolvePilotDestination('student', {
    pathname: '/pilot/report/report-id',
    search: '?view=timeline',
    hash: '#latest',
  }) === '/pilot/report/report-id?view=timeline#latest',
  'React Router location objects retain pathname, search and hash.',
);

const viteConfig = read('vite.config.ts');
assert(
  viteConfig.includes('feature/ccsf-phases-3-8-release-candidate'),
  'The approved release-candidate Preview branch is explicit.',
);
assert(
  viteConfig.includes('vercelEnvironment === "preview"')
    && viteConfig.includes('vercelBranch === APPROVED_PILOT_PREVIEW_BRANCH'),
  'Automatic Pilot activation requires both Vercel Preview and the exact approved branch.',
);
assert(
  viteConfig.includes('explicitPilotFlag === "true" || approvedPreviewBranch'),
  'Explicit authorisation or the exact approved Preview enables Pilot Mode.',
);
assert(!viteConfig.includes('feature/controlled-pilot-mode'), 'The obsolete Pilot branch is no longer authorised.');

const pilotConfig = read('src/config/pilot.ts');
assert(!pilotConfig.includes('git-fea-'), 'Hostname-pattern Pilot activation has been removed.');
assert(
  pilotConfig.includes("import.meta.env.VITE_PILOT_MODE_ENABLED === 'true' || isLocalPilotRuntime"),
  'Runtime Pilot activation remains fail-closed outside local development.',
);
assert(
  pilotConfig.includes('Demo Mode: No emergency service has been dispatched.'),
  'The canonical no-dispatch warning remains present.',
);
assert(
  pilotConfig.includes("PILOT_POST_PROFILE_REDIRECT_KEY = 'ccsf_pilot_post_profile_redirect'"),
  'The interrupted student journey uses a dedicated Pilot-only session key.',
);

const pilotAuth = read('src/pages/pilot/PilotAuth.tsx');
assert(pilotAuth.includes('useLocation'), 'Pilot authentication reads the requested route.');
assert(pilotAuth.includes('resolvePilotDestination'), 'Pilot authentication resolves role-safe destinations.');
assert(pilotAuth.includes('state: { from: destination }'), 'Profile completion receives the approved Pilot destination.');
assert(
  pilotAuth.includes('sessionStorage.setItem(PILOT_POST_PROFILE_REDIRECT_KEY, destination)'),
  'Incomplete student profiles retain the approved Pilot destination for one browser session.',
);
assert(
  pilotAuth.includes('sessionStorage.removeItem(PILOT_POST_PROFILE_REDIRECT_KEY)'),
  'Normal Pilot authentication clears stale post-profile destinations.',
);

const postProfileRedirect = read('src/components/pilot/PilotPostProfileRedirect.tsx');
assert(
  postProfileRedirect.includes("resolvePilotDestination('student', requestedPath)"),
  'Post-profile resumption revalidates the stored path as a student Pilot destination.',
);
assert(
  postProfileRedirect.includes('sessionStorage.removeItem(PILOT_POST_PROFILE_REDIRECT_KEY)'),
  'Post-profile resumption consumes the destination exactly once.',
);

const protectedRoute = read('src/components/ProtectedRoute.tsx');
assert(
  protectedRoute.includes('location.pathname}${location.search}${location.hash}'),
  'Protected routes retain deep-link query and hash state.',
);
assert(
  protectedRoute.includes('pilotDefaultDestination'),
  'Cross-role Pilot access redirects to the authenticated role workspace.',
);

const pilotGuard = read('src/components/pilot/PilotRouteGuard.tsx');
assert(
  pilotGuard.includes('state={{ from: requestedPath }}'),
  'Pilot guard redirects retain the originally requested Pilot route.',
);

const app = read('src/App.tsx');
for (const route of ['/pilot/auth', '/pilot', '/pilot/session/:sessionId', '/pilot/report/:reportId', '/pilot/resources', '/security/pilot', '/admin/pilot']) {
  assert(app.includes(`path="${route}"`), `Direct route ${route} is registered.`);
}
assert(
  app.includes('<PilotPostProfileRedirect>') && app.includes('</PilotPostProfileRedirect>'),
  'The student dashboard completes interrupted Pilot profile journeys.',
);

const vercel = read('vercel.json');
assert(vercel.includes('"destination": "/index.html"'), 'Vercel rewrites direct deep links to the SPA entry point.');

const pilotLayout = read('src/components/pilot/PilotInstitutionalLayout.tsx');
const pilotAuthView = read('src/components/pilot/PilotAuthInstitutionalView.tsx');
const authFrame = read('src/components/auth/InstitutionalAuthFrame.tsx');
assert(
  pilotLayout.includes('Simulation only · No emergency dispatch'),
  'Every authenticated Pilot screen inherits a permanent no-dispatch banner.',
);
assert(
  pilotAuthView.includes('<InstitutionalAuthFrame') && authFrame.includes('PILOT_WARNING'),
  'The shared Pilot authentication frame displays the canonical no-dispatch warning.',
);

if (failures.length) {
  console.error(`Phase 3 routing verification failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Phase 3 routing verification passed (${passes.length} assertions).`);
for (const pass of passes) console.log(`- ${pass}`);
