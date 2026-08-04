import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function write(path, content) {
  writeFileSync(path, content, 'utf8');
}

function replaceRequired(content, from, to, label) {
  if (!content.includes(from)) throw new Error(`Migration target not found: ${label}`);
  return content.replace(from, to);
}

function replaceAllRequired(content, from, to, label) {
  if (!content.includes(from)) throw new Error(`Migration target not found: ${label}`);
  return content.split(from).join(to);
}

// Canonical logo source.
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

// Generate every icon/fav icon from the untouched official source. No AI, redraw, recolour, or source overwrite.
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
    'original = Image.open(SOURCE).convert("RGBA")\nif original.getchannel("A").getextrema()[0] != 0:\n    raise RuntimeError("Official CPS/CCSF source must contain genuine transparency; refusing to alter the approved logo")\ntransparent_logo = crop_with_padding(original)',
    'brand generator image preparation',
  );
  write(path, content);
}

// Brand verification now recognises only the official CPS/CCSF source and treats every prior CCSF raster as obsolete.
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
  if (blockStart < 0 || blockEnd < 0) throw new Error('Migration target not found: branding verifier logo comparison block');
  const replacement = `try {\n  const suppliedLogo = await readFile(path.join(root, suppliedLogoPath));\n  const canonicalInfo = decodePng(suppliedLogo, suppliedLogoPath);\n  if (canonicalInfo.minAlpha !== 0 || canonicalInfo.maxAlpha !== 255) {\n    violations.push(\`${'${suppliedLogoPath}'}: official CPS/CCSF logo must contain genuine transparency and opaque artwork\`);\n  }\n} catch {\n  violations.push('official CPS/CCSF canonical PNG is missing or invalid');\n}`;
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

// Keep future brand generation aligned with the official source.
{
  const path = '.github/workflows/phase4-brand-assets.yml';
  let content = read(path);
  if (!content.includes('      - agent/safety-quest-game')) {
    content = replaceRequired(
      content,
      '      - feature/ccsf-phases-3-8-release-candidate\n',
      '      - feature/ccsf-phases-3-8-release-candidate\n      - agent/safety-quest-game\n',
      'brand workflow approved branch',
    );
  }
  if (!content.includes('      - src/assets/cps-ccsf-official-source.png')) {
    content = replaceRequired(
      content,
      '      - scripts/generate-brand-assets.py\n',
      '      - scripts/generate-brand-assets.py\n      - src/assets/cps-ccsf-official-source.png\n',
      'brand workflow source trigger',
    );
  }
  content = replaceAllRequired(content, 'Campus safety forum logo design(1).png', 'cps-ccsf-official-source.png', 'brand workflow canonical name');
  content = content.split('\n').filter((line) => !line.includes('src/assets/ccsf-logo.png') && !line.includes('public/ccsf-logo.png')).join('\n');
  write(path, content);
}

// Authorise Pilot Mode for this PR preview while preserving the existing approved release-candidate preview and production main gate.
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

// Keep the Pilot dashboard feature-complete: same Safety hub and Safety Quest, while retaining Pilot location-testing content inside Safety.
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
  if (content.includes("setView('map')") || content.includes("view === 'map'")) throw new Error('Pilot map view migration left stale map-tab references');
  write(path, content);
}

// Safety Quest launch stays inside Pilot when started from the Pilot Safety tab.
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

// Dedicated Pilot Safety Quest route and Pilot route allow-list.
{
  const path = 'src/App.tsx';
  let content = read(path);
  const marker = '                    <Route path="/security/pilot" element={';
  const route = `                    <Route path="/pilot/safety-quest" element={\n                      <ProtectedRoute allowedRoles={['student']}>\n                        <PilotRouteGuard allowedRoles={['student']}><SafetyQuest /></PilotRouteGuard>\n                      </ProtectedRoute>\n                    } />\n`;
  if (!content.includes('/pilot/safety-quest')) content = replaceRequired(content, marker, route + marker, 'Pilot Safety Quest route');
  write(path, content);
}

{
  const path = 'src/config/pilotRoutes.ts';
  let content = read(path);
  content = replaceRequired(content, "  resources: '/pilot/resources',", "  resources: '/pilot/resources',\n  safetyQuest: '/pilot/safety-quest',", 'Pilot Safety Quest route constant');
  content = replaceRequired(
    content,
    '    || pathname === PILOT_ROUTES.resources\n    || pathname.startsWith(\'/pilot/session/\')',
    '    || pathname === PILOT_ROUTES.resources\n    || pathname === PILOT_ROUTES.safetyQuest\n    || pathname.startsWith(\'/pilot/session/\')',
    'Pilot Safety Quest allow-list',
  );
  write(path, content);
}

// Return Safety Quest players to the correct dashboard context.
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

// Strengthen the Safety Quest release gate so Pilot parity cannot regress.
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
  content = replaceRequired(
    content,
    "requireMatch(game, /safety-quest-brand-lockup[\\s\\S]*tutLogo[\\s\\S]*ccsfLogo[\\s\\S]*cpsLogo/, 'TUT, CCSF and CPS branding must remain in the game scene.');",
    "requireMatch(game, /safety-quest-brand-lockup[\\s\\S]*<InstitutionBrand[\\s\\S]*cpsLogo/, 'Canonical TUT + CPS/CCSF InstitutionBrand and CPS branding must remain in the game scene.');",
    'Safety Quest canonical branding assertion',
  );
  content = replaceRequired(
    content,
    'Safety Quest release verification passed (8 checkpoints, protected route, curriculum, artwork, persistence, and RLS migration).',
    'Safety Quest release verification passed (8 checkpoints, official + Pilot Safety parity, canonical branding, curriculum, artwork, persistence, and RLS migration).',
    'Safety Quest verifier success copy',
  );
  write(path, content);
}

// The retired CCSF logo must not remain anywhere as an alternate canonical asset.
for (const path of [
  'src/assets/Campus safety forum logo design(1).png',
  'src/assets/ccsf-logo.png',
  'public/ccsf-logo.png',
]) {
  if (existsSync(path)) rmSync(path);
}

console.log('PR #45 Pilot + official CPS/CCSF canonical migration applied.');
