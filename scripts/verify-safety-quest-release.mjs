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
  'src/features/safety-quest/useSafetyQuestProgress.ts',
  'src/pages/SafetyQuest.tsx',
  'supabase/migrations/20260803201923_safety_quest_progress.sql',
];

for (const path of requiredFiles) {
  if (!existsSync(new URL(`../${path}`, import.meta.url))) {
    throw new Error(`Missing Safety Quest release file: ${path}`);
  }
}

const artwork = statSync(new URL('../public/safety-quest-campus.jpg', import.meta.url));
if (artwork.size < 200_000) throw new Error('Safety Quest artwork is unexpectedly small or missing.');

const app = read('src/App.tsx');
const dashboard = read('src/pages/Dashboard.tsx');
const safetyHub = read('src/components/student/SafetyMobilityHub.tsx');
const pilotDashboard = read('src/components/pilot/PilotStudentDashboard.tsx');
const launchCard = read('src/components/student/SafetyQuestLaunchCard.tsx');
const catalog = read('src/features/safety-quest/questCatalog.ts');
const questData = read('src/features/safety-quest/questData.ts');
const game = read('src/features/safety-quest/SafetyQuestGame.tsx');
const styles = read('src/features/safety-quest/safety-quest.css');
const progress = read('src/features/safety-quest/useSafetyQuestProgress.ts');
const migration = read('supabase/migrations/20260803201923_safety_quest_progress.sql');
const types = read('src/integrations/supabase/types.ts');

requireMatch(app, /path="\/safety-quest"[\s\S]*allowedRoles=\{\['student'\]\}/, 'Safety Quest must remain a protected student route.');
requireMatch(safetyHub, /data-testid="student-safety-tools"[\s\S]*<SafetyQuestLaunchCard\s*\/>/, 'The Safety tab must surface Safety Quest as a primary safety tool.');
if (dashboard.includes('<SafetyQuestLaunchCard')) throw new Error('Safety Quest must live under the Safety tab instead of the dashboard Home view.');
requireMatch(app, /path="\/pilot\/safety-quest"[\s\S]*PilotRouteGuard[\s\S]*<SafetyQuest \/>/, 'Pilot must expose Safety Quest through its guarded student route.');
requireMatch(pilotDashboard, /type View = [^;]*'safety'[\s\S]*view === 'safety'[\s\S]*<SafetyMobilityHub campus=\{participant\.campus\}/, 'Pilot dashboard must keep the shared Safety tab and Safety Mobility hub.');
if (!launchCard.includes("location.pathname.startsWith('/pilot') ? '/pilot/safety-quest' : '/safety-quest'")) throw new Error('Safety Quest launch must remain Pilot-aware.');

const compiledCatalog = ts.transpileModule(catalog, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const catalogModule = await import(`data:text/javascript;base64,${Buffer.from(compiledCatalog).toString('base64')}`);
const bank = catalogModule.QUEST_QUESTION_BANK;
if (!Array.isArray(bank) || bank.length < 24) throw new Error(`Safety Quest v2 requires at least 24 bank questions; found ${bank?.length ?? 0}.`);
if (catalogModule.QUEST_TOTAL !== 8) throw new Error(`Safety Quest must deliver exactly 8 missions; found ${catalogModule.QUEST_TOTAL}.`);
if (new Set(bank.map((question) => question.id)).size !== bank.length) throw new Error('Safety Quest question IDs must be unique.');
if (bank.some((question) => !question.correctOptionId || !question.options.some((option) => option.id === question.correctOptionId))) {
  throw new Error('Every bank question must resolve correctness by correctOptionId.');
}
if (/\bcorrect\s*:\s*true\b/.test(catalog)) throw new Error('Correct answers must not be encoded by a first-position correct:true flag.');

const planA = catalogModule.createQuestPlan('student-alpha');
const planB = catalogModule.createQuestPlan('student-bravo');
if (planA.length !== 8 || planB.length !== 8) throw new Error('Each student must receive exactly eight Safety Quest missions.');
if (new Set(planA.map((question) => question.topic)).size !== 8) throw new Error('Each quest must cover all eight required safety domains.');
if (JSON.stringify(planA.map((question) => question.id)) === JSON.stringify(planB.map((question) => question.id))) {
  throw new Error('Different students must not receive the same fixed eight-question sequence.');
}
const correctPositions = planA.map((question) => question.options.findIndex((option) => option.id === question.correctOptionId));
if (correctPositions.every((position) => position === 0)) throw new Error('Correct answers must not all appear as option A.');
if (new Set(correctPositions).size < 2) throw new Error('Correct answer positions must vary within a student quiz.');

for (const phrase of [
  'CCSF',
  'CPS',
  'Student Counselling',
  'Building 21',
  'registration',
  'proof of registration',
  'academic record',
  'mental-health',
  'Traffic',
  'Crime Prevention',
  'Investigation',
  'Disciplinary',
  'Engineering & Technology',
  'Control',
  'Building 4, G-51',
  'Building 4, G-63',
]) {
  if (!catalog.toLowerCase().includes(phrase.toLowerCase())) throw new Error(`Safety Quest v2 curriculum is missing: ${phrase}`);
}

requireMatch(questData, /SAFETY_QUEST_VERSION = '2026\.08-v2'/, 'Safety Quest curriculum version must be bumped for the new bank.');
requireMatch(game, /createQuestPlan\(`\$\{SAFETY_QUEST_VERSION\}:\$\{userId \?\? 'guest'\}`\)/, 'The game must build a stable personalized question plan per user.');
requireMatch(game, /selectedOption === checkpoint\.correctOptionId/, 'Answer validation must use the question answer ID after shuffling.');
requireMatch(game, /data-testid=\{`quest-checkpoint-\$\{index \+ 1\}`\}/, 'Mission interaction targets are missing.');
requireMatch(game, /safety-quest-campus-photo[\s\S]*animate=\{prefersReducedMotion/, 'The real-campus scene must keep its motion treatment.');
requireMatch(game, /x: \[0, -8, 8, -5, 5, 0\]/, 'Wrong-answer feedback must include motion when reduced motion is not requested.');
requireMatch(game, /opacity: \[0, 1, 0\][\s\S]*y: -42/, 'Correct-answer feedback must include celebratory motion.');
requireMatch(game, /import \{ InstitutionBrand \} from '@\/components\/shared\/InstitutionBrand';/, 'Safety Quest must use the shared institutional brand lockup.');
requireMatch(game, /safety-quest-brand-lockup[\s\S]*<InstitutionBrand\b/, 'Safety Quest must use one canonical TUT and CCSF/CPS institutional lockup.');
if (game.includes('cpsLogo')) throw new Error('Safety Quest must not render a duplicate CPS logo beside the canonical institutional lockup.');
requireMatch(game, /TUT Pretoria West · Interactive safety route/, 'The board must identify the campus without revealing a quiz-answer building.');
if (game.includes('safety-quest-location-chip')) throw new Error('Pre-quiz location answer chips must be removed from the game board.');
if (game.includes('Two destinations to remember')) throw new Error('Pre-quiz destination-answer spoilers must be removed.');
requireMatch(game, /No answer spoilers[\s\S]*Locations and routing answers are revealed only after you answer correctly/, 'The pre-quiz briefing must explicitly avoid answer spoilers.');
requireMatch(styles, /prefers-reduced-motion[\s\S]*safety-quest-sunwash[\s\S]*animation: none !important/, 'Ambient scene animation must respect reduced-motion preferences.');
requireMatch(game, /initial=\{\{ width: '0%' \}\}/, 'Zero progress must render as an empty bar.');
requireMatch(progress, /data && data\.quest_version !== SAFETY_QUEST_VERSION[\s\S]*freshProgress/, 'Stale v1 progress must reset when the curriculum changes.');
requireMatch(progress, /localStorage\.setItem/, 'Device progress fallback is missing.');
requireMatch(progress, /persistQueueRef\.current\.then\(save, save\)/, 'Progress writes must remain ordered.');
requireMatch(progress, /\.from\('safety_quest_progress'\)\.upsert/, 'Supabase progress upsert is missing.');

for (const policy of ['safety_quest_owner_select', 'safety_quest_owner_insert', 'safety_quest_owner_update']) {
  if (!migration.includes(policy)) throw new Error(`Migration is missing RLS policy: ${policy}`);
}
requireMatch(migration, /enable row level security/i, 'Safety Quest progress must have RLS enabled.');
requireMatch(migration, /revoke all[\s\S]*from anon/i, 'Anonymous Safety Quest table access must remain revoked.');
requireMatch(migration, /grant select, insert, update[\s\S]*to authenticated/i, 'Authenticated grants must remain least-privilege.');
requireMatch(types, /safety_quest_progress:\s*\{/, 'Generated Supabase types are missing Safety Quest progress.');

console.log('Safety Quest v2 release verification passed (24+ question bank, 8 randomized domains, shuffled answers, TUT/CCSF/CPS curriculum, spoiler controls, motion, persistence, and RLS).');
