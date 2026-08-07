import { existsSync, readFileSync, statSync } from 'node:fs';
import ts from 'typescript';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const requireMatch = (content, pattern, message) => {
  if (!pattern.test(content)) throw new Error(message);
};

const requiredFiles = [
  'public/safety-quest-campus.jpg',
  'src/components/student/SafetyQuestLaunchCard.tsx',
  'src/features/safety-quest/questCatalog.ts',
  'src/features/safety-quest/questData.ts',
  'src/features/safety-quest/SafetyQuestGame.tsx',
  'src/features/safety-quest/safety-quest.css',
  'src/features/safety-quest/safety-quest-answer-format.css',
  'src/features/safety-quest/useSafetyQuestProgress.ts',
  'src/pages/SafetyQuest.tsx',
  'supabase/migrations/20260803201923_safety_quest_progress.sql',
];

for (const path of requiredFiles) {
  if (!existsSync(new URL(`../${path}`, import.meta.url))) {
    throw new Error(`Missing Campus Safety Quiz release file: ${path}`);
  }
}

const artwork = statSync(new URL('../public/safety-quest-campus.jpg', import.meta.url));
if (artwork.size < 200_000) throw new Error('Campus Safety Quiz artwork is unexpectedly small or missing.');

const app = read('src/App.tsx');
const dashboard = read('src/pages/Dashboard.tsx');
const safetyHub = read('src/components/student/SafetyMobilityHub.tsx');
const pilotDashboard = read('src/components/pilot/PilotStudentDashboard.tsx');
const launchCard = read('src/components/student/SafetyQuestLaunchCard.tsx');
const catalog = read('src/features/safety-quest/questCatalog.ts');
const questData = read('src/features/safety-quest/questData.ts');
const game = read('src/features/safety-quest/SafetyQuestGame.tsx');
const styles = read('src/features/safety-quest/safety-quest.css');
const answerStyles = read('src/features/safety-quest/safety-quest-answer-format.css');
const progress = read('src/features/safety-quest/useSafetyQuestProgress.ts');
const migration = read('supabase/migrations/20260803201923_safety_quest_progress.sql');
const types = read('src/integrations/supabase/types.ts');

requireMatch(app, /path="\/safety-quest"[\s\S]*allowedRoles=\{\['student'\]\}/, 'Campus Safety Quiz must remain a protected student route.');
requireMatch(safetyHub, /data-testid="student-safety-tools"[\s\S]*<SafetyQuestLaunchCard\s*\/>/, 'The Safety tab must surface the Campus Safety Quiz as a primary safety tool.');
if (dashboard.includes('<SafetyQuestLaunchCard')) throw new Error('Campus Safety Quiz must live under the Safety tab instead of the dashboard Home view.');
requireMatch(app, /path="\/pilot\/safety-quest"[\s\S]*PilotRouteGuard[\s\S]*<SafetyQuest \/>/, 'Pilot must expose the Campus Safety Quiz through its guarded student route.');
requireMatch(pilotDashboard, /type View = [^;]*'safety'[\s\S]*view === 'safety'[\s\S]*<SafetyMobilityHub campus=\{participant\.campus\}/, 'Pilot dashboard must keep the shared Safety tab and Safety Mobility hub.');
if (!launchCard.includes("location.pathname.startsWith('/pilot') ? '/pilot/safety-quest' : '/safety-quest'")) throw new Error('Campus Safety Quiz launch must remain Pilot-aware.');

const compiledCatalog = ts.transpileModule(catalog, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const catalogModule = await import(`data:text/javascript;base64,${Buffer.from(compiledCatalog).toString('base64')}`);
const bank = catalogModule.QUEST_QUESTION_BANK;
if (!Array.isArray(bank) || bank.length < 24) throw new Error(`Campus Safety Quiz requires at least 24 bank questions; found ${bank?.length ?? 0}.`);
if (catalogModule.QUEST_TOTAL !== 8) throw new Error(`Campus Safety Quiz must deliver exactly 8 missions; found ${catalogModule.QUEST_TOTAL}.`);
if (new Set(bank.map((question) => question.id)).size !== bank.length) throw new Error('Campus Safety Quiz question IDs must be unique.');
if (bank.some((question) => !question.correctOptionId || !question.options.some((option) => option.id === question.correctOptionId))) {
  throw new Error('Every bank question must resolve correctness by correctOptionId.');
}
if (/\bcorrect\s*:\s*true\b/.test(catalog)) throw new Error('Correct answers must not be encoded by a first-position correct:true flag.');

const planA = catalogModule.createQuestPlan('student-alpha');
const planB = catalogModule.createQuestPlan('student-bravo');
if (planA.length !== 8 || planB.length !== 8) throw new Error('Each student must receive exactly eight Campus Safety Quiz missions.');
if (new Set(planA.map((question) => question.topic)).size !== 8) throw new Error('Each quiz must cover all eight CPS service/routing domains.');
if (JSON.stringify(planA.map((question) => question.id)) === JSON.stringify(planB.map((question) => question.id))) {
  throw new Error('Different students must not receive the same fixed eight-question sequence.');
}
const correctPositions = planA.map((question) => question.options.findIndex((option) => option.id === question.correctOptionId));
if (correctPositions.every((position) => position === 0)) throw new Error('Correct answers must not all appear as option A.');
if (new Set(correctPositions).size < 2) throw new Error('Correct answer positions must vary within a student quiz.');

for (const phrase of [
  'Control Room',
  'Traffic Services',
  'Investigation',
  'Fire and Emergency Services',
  'Events Compliance & Crime Prevention (CCSF)',
  'Dinokeng Building (Build-21)',
  'Building 4, G-51',
  'Building 4, G-63',
  'Campus Safety App',
]) {
  if (!catalog.toLowerCase().includes(phrase.toLowerCase())) throw new Error(`Campus Safety Quiz curriculum is missing: ${phrase}`);
}

for (const forbidden of [
  'Student Counselling',
  'mental-health',
  'Disciplinary',
  'Engineering & Technology',
  'mark-change',
  'password and OTP',
]) {
  if (catalog.toLowerCase().includes(forbidden.toLowerCase())) throw new Error(`Campus Safety Quiz contains non-approved source content: ${forbidden}`);
}

requireMatch(questData, /SAFETY_QUEST_VERSION = '2026\.08-v3-cps-services'/, 'Campus Safety Quiz curriculum version must reset stale progress.');
requireMatch(game, /createQuestPlan\(`\$\{SAFETY_QUEST_VERSION\}:\$\{userId \?\? 'guest'\}`\)/, 'The game must build a stable personalized question plan per user.');
requireMatch(game, /selectedOption === checkpoint\.correctOptionId/, 'Answer validation must use the question answer ID after shuffling.');
requireMatch(game, /data-testid=\{`quest-checkpoint-\$\{index \+ 1\}`\}/, 'Mission interaction targets are missing.');
requireMatch(game, /safety-quest-campus-photo[\s\S]*animate=\{prefersReducedMotion/, 'The real-campus scene must keep its motion treatment.');
requireMatch(game, /x: \[0, -8, 8, -5, 5, 0\]/, 'Wrong-answer feedback must include motion when reduced motion is not requested.');
requireMatch(game, /opacity: \[0, 1, 0\][\s\S]*y: -42/, 'Correct-answer feedback must include celebratory motion.');
requireMatch(game, /import \{ InstitutionBrand \} from '@\/components\/shared\/InstitutionBrand';/, 'Campus Safety Quiz must use the shared institutional brand lockup.');
requireMatch(game, /safety-quest-brand-lockup[\s\S]*<InstitutionBrand\b/, 'Campus Safety Quiz must use one canonical TUT and CCSF/CPS institutional lockup.');
if (game.includes('cpsLogo')) throw new Error('Campus Safety Quiz must not render a duplicate CPS logo beside the canonical institutional lockup.');
requireMatch(game, /TUT Pretoria Campus · Interactive safety route/, 'The board must use the approved Pretoria Campus name.');
requireMatch(game, /Campus Safety Quiz/, 'The quiz must use Campus Safety Quiz branding.');
requireMatch(game, /Approved source only[\s\S]*approved CPS service and building-routing bank/, 'The quiz briefing must declare the approved source boundary.');
requireMatch(answerStyles, /white-space:\s*pre-line/, 'Multi-point answer choices must render each route on a vertical line.');
requireMatch(styles, /prefers-reduced-motion[\s\S]*safety-quest-sunwash[\s\S]*animation: none !important/, 'Ambient scene animation must respect reduced-motion preferences.');
requireMatch(game, /initial=\{\{ width: '0%' \}\}/, 'Zero progress must render as an empty bar.');
requireMatch(progress, /data && data\.quest_version !== SAFETY_QUEST_VERSION[\s\S]*freshProgress/, 'Stale quiz progress must reset when the curriculum changes.');
requireMatch(progress, /localStorage\.setItem/, 'Device progress fallback is missing.');
requireMatch(progress, /persistQueueRef\.current\.then\(save, save\)/, 'Progress writes must remain ordered.');
requireMatch(progress, /\.from\('safety_quest_progress'\)\.upsert/, 'Supabase progress upsert is missing.');

for (const policy of ['safety_quest_owner_select', 'safety_quest_owner_insert', 'safety_quest_owner_update']) {
  if (!migration.includes(policy)) throw new Error(`Migration is missing RLS policy: ${policy}`);
}
requireMatch(migration, /enable row level security/i, 'Campus Safety Quiz progress must have RLS enabled.');
requireMatch(migration, /revoke all[\s\S]*from anon/i, 'Anonymous Campus Safety Quiz table access must remain revoked.');
requireMatch(migration, /grant select, insert, update[\s\S]*to authenticated/i, 'Authenticated grants must remain least-privilege.');
requireMatch(types, /safety_quest_progress:\s*\{/, 'Generated Supabase types are missing Campus Safety Quiz progress.');

console.log('Campus Safety Quiz release verification passed (24+ approved-source questions, 8 randomized CPS/routing domains, vertical multi-point answers, shuffled answer positions, motion, persistence, and RLS).');
