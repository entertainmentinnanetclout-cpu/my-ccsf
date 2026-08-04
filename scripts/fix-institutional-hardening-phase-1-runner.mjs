import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/features/safety-quest/SafetyQuestGame.tsx';
const source = readFileSync(path, 'utf8');
const duplicateImport = "import cpsLogo from '@/assets/CPS Campus Protection Services logo(1).png';\n";
writeFileSync(path, source.replace(duplicateImport, ''));
console.log('Removed the stale duplicate CPS logo import.');
