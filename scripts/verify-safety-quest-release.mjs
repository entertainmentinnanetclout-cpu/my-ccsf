import { existsSync, readFileSync, statSync } from 'node:fs';

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
const catalog = read('src/features/safety-quest/questCatalog.ts');
const game = read('src/features/safety-quest/SafetyQuestGame.tsx');
const progress = read('src/features/safety-quest/useSafetyQuestProgress.ts');
const migration = read('supabase/migrations/20260803201923_safety_quest_progress.sql');
const types = read('src/integrations/supabase/types.ts');

requireMatch(app, /path="\/safety-quest"[\s\S]*allowedRoles=\{\['student'\]\}/, 'Safety Quest must remain a protected student route.');
requireMatch(dashboard, /<SafetyQuestLaunchCard\s*\/>/, 'Student dashboard must launch Safety Quest.');

const checkpointCount = (catalog.match(/^\s{4}id: '[a-z0-9-]+',$/gm) ?? []).length;
if (checkpointCount !== 8) throw new Error(`Expected 8 Safety Quest checkpoints; found ${checkpointCount}.`);

for (const phrase of [
  'Traffic',
  'Crime Prevention',
  'Investigation',
  'Disciplinary',
  'Engineering & Technology',
  'Control',
  'Building 4, G-51',
  'Building 4, G-63',
]) {
  if (!catalog.includes(phrase)) throw new Error(`Safety Quest curriculum is missing: ${phrase}`);
}

requireMatch(game, /data-testid=\{`quest-checkpoint-\$\{index \+ 1\}`\}/, 'Checkpoint interaction targets are missing.');
requireMatch(game, /initial=\{\{ width: '0%' \}\}/, 'Zero progress must render as an empty bar.');
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

console.log('Safety Quest release verification passed (8 checkpoints, protected route, curriculum, artwork, persistence, and RLS migration).');
