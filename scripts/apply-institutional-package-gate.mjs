import { readFileSync, writeFileSync } from 'node:fs';

const packagePath = 'package.json';
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const verifier = 'node scripts/verify-institutional-phases-2-3.mjs';
packageJson.scripts['test:institutional-phases-2-3'] = verifier;

for (const scriptName of ['build', 'build:dev']) {
  const current = packageJson.scripts[scriptName];
  if (typeof current === 'string' && !current.includes('verify-institutional-phases-2-3.mjs')) {
    packageJson.scripts[scriptName] = current.replace(
      'node scripts/verify-safety-quest-release.mjs',
      'node scripts/verify-safety-quest-release.mjs && node scripts/verify-institutional-phases-2-3.mjs',
    );
  }
}

if (!packageJson.scripts['qa:pilot'].includes('test:institutional-phases-2-3')) {
  packageJson.scripts['qa:pilot'] = packageJson.scripts['qa:pilot'].replace(
    'npm run test:admin-visuals && npm run typecheck',
    'npm run test:admin-visuals && npm run test:institutional-phases-2-3 && npm run typecheck',
  );
}

writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
console.log('Institutional Phase 2/3 verifier added to package release gates.');
