import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const violations = [];
const textExtensions = new Set(['.html', '.js', '.json', '.mjs', '.ts', '.tsx']);

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

function readPngSize(buffer, label) {
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    violations.push(`${label}: invalid PNG signature`);
    return null;
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const productionFiles = ['index.html', ...(await walk('src')), ...(await walk('public'))];
const prohibitedLogoReferences = [
  ['CPS/CCSF canonical co-brand artwork', /cps-ccsf-official-source\.png/i],
  ['legacy mobile unit logo', /mobile-logo\.png/i],
  ['CPS unit logo artwork', /CPS Campus Protection Services logo/i],
  ['CCSF raster/vector logo', /ccsf-logo\.(?:png|svg)/i],
];

for (const file of productionFiles) {
  const content = await readFile(path.join(root, file), 'utf8');
  for (const [label, pattern] of prohibitedLogoReferences) {
    if (pattern.test(content)) violations.push(`${file}: ${label} is referenced by production code`);
  }
}

const brandModule = await readFile(path.join(root, 'src', 'brand', 'index.ts'), 'utf8');
if (!brandModule.includes("@/assets/tut-logo.png") || !brandModule.includes("@/assets/tut_light_theme.png")) {
  violations.push('src/brand/index.ts: TUT logos are not the canonical institutional assets');
}
if (/ccsfLogo|partnershipLabel/i.test(brandModule)) violations.push('src/brand/index.ts: unit co-brand contract still exists');

const lockup = await readFile(path.join(root, 'src', 'components', 'shared', 'InstitutionBrand.tsx'), 'utf8');
if (/BRAND\.assets\.ccsf|styles\.ccsf|divider/i.test(lockup)) violations.push('InstitutionBrand: CCSF/CPS co-brand lockup still exists');

const installPrompt = await readFile(path.join(root, 'src', 'components', 'shared', 'PWAInstallPrompt.tsx'), 'utf8');
if (/ccsfLogo|CCSF identity|official CCSF application/i.test(installPrompt)) violations.push('PWA install prompt still presents a unit identity');

const indexHtml = await readFile(path.join(root, 'index.html'), 'utf8');
const manifest = await readFile(path.join(root, 'public', 'manifest.json'), 'utf8');
for (const [label, content] of [['index.html', indexHtml], ['public/manifest.json', manifest]]) {
  if (/Campus Community Safety Forum|Campus Protection Services/i.test(content)) violations.push(`${label}: prohibited unit branding remains in app metadata`);
  if (!/Tshwane University of Technology/i.test(content)) violations.push(`${label}: TUT institutional identity is missing`);
}

const expectedPngs = [
  ['public/app-icon-1024.png', 1024, 1024],
  ['public/app-icon-512.png', 512, 512],
  ['public/app-icon-192.png', 192, 192],
  ['public/maskable-icon-512.png', 512, 512],
  ['public/apple-touch-icon.png', 180, 180],
  ['public/favicon.png', 64, 64],
  ['public/favicon-32x32.png', 32, 32],
  ['public/favicon-16x16.png', 16, 16],
  ['public/og-image.png', 1200, 630],
];
for (const [relativePath, width, height] of expectedPngs) {
  try {
    const size = readPngSize(await readFile(path.join(root, relativePath)), relativePath);
    if (size && (size.width !== width || size.height !== height)) {
      violations.push(`${relativePath}: expected ${width}x${height}, received ${size.width}x${size.height}`);
    }
  } catch {
    violations.push(`${relativePath}: generated TUT asset is missing`);
  }
}

if (violations.length) {
  console.error('TUT CI brand verification failed:\n' + violations.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('TUT CI brand verification passed: TUT-only institutional logo contract, compliant metadata, and generated PWA/browser/social assets.');
