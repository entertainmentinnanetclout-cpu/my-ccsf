import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const write = (path, content) => writeFileSync(path, content, 'utf8');

function replaceRequired(content, from, to, label) {
  if (!content.includes(from)) throw new Error(`Migration target not found: ${label}`);
  return content.replace(from, to);
}

function replaceAllRequired(content, from, to, label) {
  if (!content.includes(from)) throw new Error(`Migration target not found: ${label}`);
  return content.split(from).join(to);
}

// 1) Make the uploaded CPS/CCSF artwork the only canonical app logo source.
{
  const path = 'src/brand/index.ts';
  let content = read(path);
  content = replaceRequired(
    content,
    "import ccsfLogo from '@/assets/Campus safety forum logo design(1).png';",
    "import ccsfLogo from '@/assets/cps-ccsf-official-source.png';",
    'brand canonical import',
  );
  write(path, content);
}

// 2) Derive app icons/favicons from the approved source without rewriting, recolouring,
//    background-removing or overwriting the approved source itself.
{
  const path = 'scripts/generate-brand-assets.py';
  let content = read(path);
  content = replaceRequired(
    content,
    'SOURCE = ROOT / "src/assets/Campus safety forum logo design(1).png"\nCANONICAL_COPIES = [\n    SOURCE,\n    ROOT / "src/assets/ccsf-logo.png",\n    ROOT / "public/ccsf-logo.png",\n]',
    'SOURCE = ROOT / "src/assets/cps-ccsf-official-source.png"\nCANONICAL_COPIES: list[Path] = []',
    'brand generator source block',
  );
  content = replaceRequired(
    content,
    'original = Image.open(SOURCE)\ntransparent_logo = crop_with_padding(remove_edge_background(original))',
    'original = Image.open(SOURCE).convert("RGBA")\ntransparent_logo = crop_with_padding(original)',
    'brand generator source preparation',
  );
  write(path, content);
}

// 3) Enforce the new source and make all previous CCSF raster/vector assets obsolete.
{
  const path = 'scripts/verify-branding.mjs';
  let content = read(path);
  content = replaceRequired(
    content,
    "const suppliedLogoPath = path.join('src', 'assets', 'Campus safety forum logo design(1).png');\nconst publicLogoPath = path.join('public', 'ccsf-logo.png');",
    "const suppliedLogoPath = path.join('src', 'assets', 'cps-ccsf-official-source.png');",
    'branding verifier canonical path',
  );
  content = replaceRequired(
    content,
    "    ['legacy CCSF raster import', /@\\/assets\\/ccsf-logo\\.png/],",
    "    ['legacy CCSF raster import', /@\\/assets\\/ccsf-logo\\.png/],\n    ['legacy public CCSF raster reference', /\\/ccsf-logo\\.png/],\n    ['retired CCSF source reference', /Campus safety forum logo design\\(1\\)\\.png/],",
    'branding verifier prohibited assets',
  );
  content = replaceRequired(
    content,
    "if (!brandModule.includes(\"@/assets/Campus safety forum logo design(1).png\")) {\n  violations.push('src/brand/index.ts: supplied CCSF logo is not the canonical import');\n}",
    "if (!brandModule.includes(\"@/assets/cps-ccsf-official-source.png\")) {\n  violations.push('src/brand/index.ts: official CPS/CCSF logo is not the canonical import');\n}",
    'branding verifier brand module expectation',
  );

  const blockStart = content.indexOf("try {\n  const [suppliedLogo, publicLogo, compatibilityLogo]");
  const blockEndMarker = "} catch {\n  violations.push('transparent canonical CCSF logo or public compatibility copy is missing');\n}";
  const blockEnd = content.indexOf(blockEndMarker, blockStart);
  if (blockStart < 0 || blockEnd < 0) throw new Error('Migration target not found: branding verifier legacy logo comparison block');
  const replacement = `try {\n  const suppliedLogo = await readFile(path.join(root, suppliedLogoPath));\n  if (suppliedLogo.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {\n    violations.push(\`${'${suppliedLogoPath}'}: invalid PNG signature\`);\n  }\n} catch {\n  violations.push('official CPS/CCSF canonical PNG is missing or invalid');\n}`;
  content = content.slice(0, blockStart) + replacement + content.slice(blockEnd + blockEndMarker.length);

  content = replaceRequired(
    content,
    "for (const obsoleteAsset of [\n  path.join('src', 'assets', 'ccsf-logo.svg'),",
    "for (const obsoleteAsset of [\n  path.join('src', 'assets', 'Campus safety forum logo design(1).png'),\n  path.join('src', 'assets', 'ccsf-logo.png'),\n  path.join('public', 'ccsf-logo.png'),\n  path.join('src', 'assets', 'ccsf-logo.svg'),",
    'branding verifier obsolete list',
  );
  content = replaceRequired(
    content,
    'Brand verification passed: transparent canonical CCSF artwork, solid-white installed app icons, transparent browser favicons, platform-correct dimensions,',
    'Brand verification passed: official CPS/CCSF canonical artwork, solid-white installed app icons, transparent browser favicons, platform-correct dimensions,',
    'branding verifier success copy',
  );
  write(path, content);
}

// 4) Keep future asset generation bound to the approved source on permanent release branches.
{
  const path = '.github/workflows/phase4-brand-assets.yml';
  let content = read(path);
  if (!content.includes('      - src/assets/cps-ccsf-official-source.png')) {
    content = replaceRequired(
      content,
      '      - scripts/generate-brand-assets.py\n',
      '      - scripts/generate-brand-assets.py\n      - src/assets/cps-ccsf-official-source.png\n',
      'brand workflow source trigger',
    );
  }
  content = replaceAllRequired(content, 'Campus safety forum logo design(1).png', 'cps-ccsf-official-source.png', 'brand workflow canonical name');
  content = content
    .split('\n')
    .filter((line) => !line.includes('src/assets/ccsf-logo.png') && !line.includes('public/ccsf-logo.png'))
    .join('\n');
  write(path, content);
}

// 5) Enable Pilot Mode on this PR Preview branch only, while preserving the existing release-candidate and production gates.
{
  const path = 'vite.config.ts';
  let content = read(path);
  content = replaceRequired(
    content,
    'const APPROVED_PILOT_PREVIEW_BRANCH = "feature/ccsf-phases-3-8-release-candidate";',
    'const APPROVED_PILOT_PREVIEW_BRANCHES = new Set(["feature/ccsf-phases-3-8-release-candidate", "agent/safety-quest-game"]);',
    'pilot preview branch constant',
  );
  content = replaceRequired(
    content,
    '    vercelEnvironment === "preview" && vercelBranch === APPROVED_PILOT_PREVIEW_BRANCH;',
    '    vercelEnvironment === "preview" && Boolean(vercelBranch && APPROVED_PILOT_PREVIEW_BRANCHES.has(vercelBranch));',
    'pilot preview branch check',
  );
  write(path, content);
}

// 6) Give Pilot the same Safety tab and shared SafetyMobilityHub as the official student dashboard,
//    retaining Pilot-specific location/testing cards inside that Safety view.
{
  const path = 'src/components/pilot/PilotStudentDashboard.tsx';
  let content = read(path);
  content = replaceRequired(content, '  RefreshCw,\n  ShieldCheck,', '  RefreshCw,\n  Radar,\n  ShieldCheck,', 'Pilot Radar icon');
  content = replaceRequired(
    content,
    "import { StudentDashboardHome } from '@/components/student/StudentDashboardHome';",
    "import { StudentDashboardHome } from '@/components/student/StudentDashboardHome';\nimport { SafetyMobilityHub } from '@/components/student/SafetyMobilityHub';",
    'Pilot SafetyMobilityHub import',
  );
  content = replaceRequired(
    content,
    "type View = 'home' | 'mycases' | 'report' | 'map' | 'support';\nconst PILOT_VIEWS = new Set<View>(['home', 'mycases', 'report', 'map', 'support']);",
    "type View = 'home' | 'mycases' | 'report' | 'safety' | 'support';\nconst PILOT_VIEWS = new Set<View>(['home', 'mycases', 'report', 'safety', 'support']);",
    'Pilot view model',
  );
  content = replaceRequired(content, "    { view: 'map', icon: MapPin, label: 'Map' },", "    { view: 'safety', icon: Radar, label: 'Safety' },", 'Pilot Safety nav item');
  content = replaceRequired(
    content,
    '<QuickAction icon={MapPin} title="Test location" description="Use readable address capture and coordinates." onClick={() => setView(\'map\')} />',
    '<QuickAction icon={Radar} title="Open Safety hub" description="Use Safety Quest, Campus Radar, travel tools and location testing." onClick={() => setView(\'safety\')} />',
    'Pilot Safety quick action',
  );
  content = replaceRequired(
    content,
    "        {view === 'map' && (\n          <div className=\"space-y-5 px-4 sm:px-6\">\n            <Card>",
    "        {view === 'safety' && (\n          <div className=\"space-y-5 px-4 sm:px-6\">\n            <SafetyMobilityHub campus={participant.campus} />\n            <Card>",
    'Pilot Safety view content',
  );
  content = replaceRequired(
    content,
    '<Button variant="outline" className="w-full justify-start" onClick={() => setView(\'map\')}><MapPin className="mr-2 h-4 w-4" />Test location workflow</Button>',
    '<Button variant="outline" className="w-full justify-start" onClick={() => setView(\'safety\')}><Radar className="mr-2 h-4 w-4" />Open Safety hub & location tools</Button>',
    'Pilot support Safety button',
  );
  if (content.includes("setView('map')") || content.includes("view === 'map'")) {
    throw new Error('Pilot map view migration left stale map-tab references');
  }
  write(path, content);
}

// 7) Keep Safety Quest inside the Pilot context when launched from Pilot Safety.
{
  const path = 'src/components/student/SafetyQuestLaunchCard.tsx';
  let content = read(path);
  content = replaceRequired(content, "import { Link } from 'react-router-dom';", "import { Link, useLocation } from 'react-router-dom';", 'Safety Quest launch location import');
  content = replaceRequired(
    content,
    'export function SafetyQuestLaunchCard() {\n  return (',
    "export function SafetyQuestLaunchCard() {\n  const location = useLocation();\n  const safetyQuestHref = location.pathname.startsWith('/pilot') ? '/pilot/safety-quest' : '/safety-quest';\n\n  return (",
    'Safety Quest pilot-aware destination',
  );
  content = replaceRequired(content, '<Link to="/safety-quest">', '<Link to={safetyQuestHref}>', 'Safety Quest launch link');
  write(path, content);
}

{
  const path = 'src/App.tsx';
  let content = read(path);
  const marker = '                    <Route path="/security/pilot" element={';
  const route = `                    <Route path="/pilot/safety-quest" element={\n                      <ProtectedRoute allowedRoles={['student']}>\n                        <PilotRouteGuard allowedRoles={['student']}><SafetyQuest /></PilotRouteGuard>\n                      </ProtectedRoute>\n                    } />\n`;
  if (!content.includes('/pilot/safety-quest')) {
    content = replaceRequired(content, marker, route + marker, 'Pilot Safety Quest route');
  }
  write(path, content);
}

{
  const path = 'src/config/pilotRoutes.ts';
  let content = read(path);
  content = replaceRequired(content, "  resources: '/pilot/resources',", "  resources: '/pilot/resources',\n  safetyQuest: '/pilot/safety-quest',", 'Pilot Safety Quest route constant');
  content = replaceRequired(
    content,
    "    || pathname === PILOT_ROUTES.resources\n    || pathname.startsWith('/pilot/session/')",
    "    || pathname === PILOT_ROUTES.resources\n    || pathname === PILOT_ROUTES.safetyQuest\n    || pathname.startsWith('/pilot/session/')",
    'Pilot Safety Quest allow-list',
  );
  write(path, content);
}

{
  const path = 'src/features/safety-quest/SafetyQuestGame.tsx';
  let content = read(path);
  content = replaceRequired(content, "import { Link } from 'react-router-dom';", "import { Link, useLocation } from 'react-router-dom';", 'Safety Quest game location import');
  content = replaceRequired(
    content,
    'export function SafetyQuestGame({ userId }: { userId: string | null | undefined }) {\n  const { progress, syncState, recordAnswer, resetQuest } = useSafetyQuestProgress(userId);',
    "export function SafetyQuestGame({ userId }: { userId: string | null | undefined }) {\n  const location = useLocation();\n  const returnPath = location.pathname.startsWith('/pilot') ? '/pilot?tab=safety' : '/dashboard?tab=safety';\n  const { progress, syncState, recordAnswer, resetQuest } = useSafetyQuestProgress(userId);",
    'Safety Quest context return path',
  );
  content = replaceAllRequired(content, 'to="/dashboard"', 'to={returnPath}', 'Safety Quest dashboard return links');
  write(path, content);
}

// 8) Lock Pilot Safety parity and canonical scene branding into CI.
{
  const path = 'scripts/verify-safety-quest-release.mjs';
  let content = read(path);
  content = replaceRequired(
    content,
    "const safetyHub = read('src/components/student/SafetyMobilityHub.tsx');",
    "const safetyHub = read('src/components/student/SafetyMobilityHub.tsx');\nconst pilotDashboard = read('src/components/pilot/PilotStudentDashboard.tsx');\nconst launchCard = read('src/components/student/SafetyQuestLaunchCard.tsx');",
    'Safety Quest verifier Pilot inputs',
  );
  content = replaceRequired(
    content,
    "if (dashboard.includes('<SafetyQuestLaunchCard')) throw new Error('Safety Quest must live under the Safety tab instead of the dashboard Home view.');",
    "if (dashboard.includes('<SafetyQuestLaunchCard')) throw new Error('Safety Quest must live under the Safety tab instead of the dashboard Home view.');\nrequireMatch(app, /path=\"\\/pilot\\/safety-quest\"[\\s\\S]*PilotRouteGuard[\\s\\S]*<SafetyQuest \\/>/, 'Pilot must expose Safety Quest through its guarded student route.');\nrequireMatch(pilotDashboard, /type View = [^;]*'safety'[\\s\\S]*view === 'safety'[\\s\\S]*<SafetyMobilityHub campus=\\{participant\\.campus\\}/, 'Pilot dashboard must keep the shared Safety tab and Safety Mobility hub.');\nrequireMatch(launchCard, /pathname\\.startsWith\\('\/pilot'\\)[\\s\\S]*'\/pilot\/safety-quest'/, 'Safety Quest launch must remain Pilot-aware.');",
    'Safety Quest verifier Pilot parity assertions',
  );
  if (!content.includes("requireMatch(game, /safety-quest-brand-lockup[\\s\\S]*<InstitutionBrand\\b[\\s\\S]*cpsLogo/")) {
    throw new Error('Safety Quest canonical InstitutionBrand assertion is missing');
  }
  content = replaceRequired(
    content,
    'Safety Quest release verification passed (8 checkpoints, protected route, curriculum, canonical branding, artwork, persistence, and RLS migration).',
    'Safety Quest release verification passed (8 checkpoints, official + Pilot Safety parity, canonical branding, curriculum, artwork, persistence, and RLS migration).',
    'Safety Quest verifier success copy',
  );
  write(path, content);
}

// 9) Remove the retired CCSF logo assets completely.
for (const path of [
  'src/assets/Campus safety forum logo design(1).png',
  'src/assets/ccsf-logo.png',
  'public/ccsf-logo.png',
]) {
  if (existsSync(path)) rmSync(path);
}

console.log('PR #45 Pilot + official CPS/CCSF canonical migration applied.');
