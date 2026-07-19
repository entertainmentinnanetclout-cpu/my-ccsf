import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const productionRoots = ['src', 'public'];
const textExtensions = new Set(['.html', '.js', '.json', '.mjs', '.svg', '.ts', '.tsx']);
const violations = [];

async function walk(relativePath) {
  const entries = await readdir(path.join(root, relativePath), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) files.push(...await walk(child));
    else if (textExtensions.has(path.extname(entry.name))) files.push(child);
  }

  return files;
}

const files = [
  'index.html',
  ...(await Promise.all(productionRoots.map(walk))).flat(),
];

for (const file of files) {
  if (file === path.join('src', 'brand', 'index.ts')) continue;

  const content = await readFile(path.join(root, file), 'utf8');
  const prohibited = [
    ['legacy CCSF raster import', /@\/assets\/ccsf-logo\.png/],
    ['direct TUT logo import', /@\/assets\/(?:tut-logo\.png|tut_light_theme\.png)/],
    ['obsolete product expansion', /Campus Crime Safety Forum/],
    ['obsolete logo tagline', /NEXT LEVEL SECURITY/],
    ['TUT-text-only favicon', />\s*TUT\s*</],
  ];

  for (const [label, pattern] of prohibited) {
    if (pattern.test(content)) violations.push(`${file}: ${label}`);
  }
}

try {
  await access(path.join(root, '.brand-assets', 'logo.hex.part01'), constants.F_OK);
  violations.push('.brand-assets/logo.hex.part01: incomplete transfer artifact still exists');
} catch {
  // Expected: Phase 2 removes the staged hex fragment.
}

const lockupConsumers = await Promise.all(
  files
    .filter((file) => file.endsWith('.tsx'))
    .map(async (file) => ({ file, content: await readFile(path.join(root, file), 'utf8') })),
);
const lockupCount = lockupConsumers.reduce(
  (total, { content }) => total + (content.match(/<InstitutionBrand\b/g)?.length ?? 0),
  0,
);

if (lockupCount < 11) {
  violations.push(`shared co-brand lockup appears ${lockupCount} times; expected at least 11`);
}

if (violations.length > 0) {
  console.error('Brand verification failed:\n' + violations.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log(`Brand verification passed: ${lockupCount} canonical CCSF + TUT lockups and no prohibited legacy production references.`);
