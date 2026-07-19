import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';

const root = process.cwd();
const suppliedLogoPath = path.join('src', 'assets', 'Campus safety forum logo design(1).png');
const publicLogoPath = path.join('public', 'ccsf-logo.png');
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

function paeth(left, above, upperLeft) {
  const prediction = left + above - upperLeft;
  const distanceLeft = Math.abs(prediction - left);
  const distanceAbove = Math.abs(prediction - above);
  const distanceUpperLeft = Math.abs(prediction - upperLeft);
  if (distanceLeft <= distanceAbove && distanceLeft <= distanceUpperLeft) return left;
  if (distanceAbove <= distanceUpperLeft) return above;
  return upperLeft;
}

function decodePng(buffer, label) {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error(`${label}: invalid PNG signature`);

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  if (bitDepth !== 8 || ![4, 6].includes(colorType)) {
    throw new Error(`${label}: expected 8-bit PNG with alpha; received bitDepth=${bitDepth}, colorType=${colorType}`);
  }

  const channels = colorType === 6 ? 4 : 2;
  const stride = width * channels;
  const compressed = Buffer.concat(idat);
  const raw = inflateSync(compressed);
  const rows = Buffer.alloc(stride * height);
  let rawOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const rowStart = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[rawOffset + x];
      const left = x >= channels ? rows[rowStart + x - channels] : 0;
      const above = y > 0 ? rows[rowStart - stride + x] : 0;
      const upperLeft = y > 0 && x >= channels ? rows[rowStart - stride + x - channels] : 0;
      let reconstructed;
      if (filter === 0) reconstructed = value;
      else if (filter === 1) reconstructed = (value + left) & 255;
      else if (filter === 2) reconstructed = (value + above) & 255;
      else if (filter === 3) reconstructed = (value + Math.floor((left + above) / 2)) & 255;
      else if (filter === 4) reconstructed = (value + paeth(left, above, upperLeft)) & 255;
      else throw new Error(`${label}: unsupported PNG filter ${filter}`);
      rows[rowStart + x] = reconstructed;
    }
    rawOffset += stride;
  }

  let minAlpha = 255;
  let maxAlpha = 0;
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  let visible = 0;
  const alphaIndex = channels - 1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = rows[y * stride + x * channels + alphaIndex];
      minAlpha = Math.min(minAlpha, alpha);
      maxAlpha = Math.max(maxAlpha, alpha);
      if (alpha > 0) {
        visible += 1;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + 1);
        bottom = Math.max(bottom, y + 1);
      }
    }
  }

  return {
    width,
    height,
    minAlpha,
    maxAlpha,
    visibleCoverage: visible / (width * height),
    footprint: Math.max(right - left, bottom - top) / Math.max(width, height),
  };
}

async function verifyPng(relativePath, expectedSize, footprintRange) {
  try {
    const buffer = await readFile(path.join(root, relativePath));
    const info = decodePng(buffer, relativePath);
    if (info.width !== expectedSize || info.height !== expectedSize) {
      violations.push(`${relativePath}: expected ${expectedSize}x${expectedSize}, received ${info.width}x${info.height}`);
    }
    if (info.minAlpha !== 0 || info.maxAlpha !== 255) {
      violations.push(`${relativePath}: expected genuine transparent and opaque pixels, alpha range is ${info.minAlpha}-${info.maxAlpha}`);
    }
    if (footprintRange && (info.footprint < footprintRange[0] || info.footprint > footprintRange[1])) {
      violations.push(`${relativePath}: optical footprint ${info.footprint.toFixed(3)} is outside ${footprintRange.join('–')}`);
    }
    return info;
  } catch (error) {
    violations.push(error instanceof Error ? error.message : `${relativePath}: PNG verification failed`);
    return null;
  }
}

const files = ['index.html', ...(await Promise.all(productionRoots.map(walk))).flat()];
for (const file of files) {
  if (file === path.join('src', 'brand', 'index.ts')) continue;
  const content = await readFile(path.join(root, file), 'utf8');
  const prohibited = [
    ['legacy CCSF raster import', /@\/assets\/ccsf-logo\.png/],
    ['generated CCSF vector reference', /ccsf-logo\.svg/],
    ['direct TUT logo import', /@\/assets\/(?:tut-logo\.png|tut_light_theme\.png)/],
    ['obsolete product expansion', /Campus Crime Safety Forum/],
    ['obsolete logo tagline', /NEXT LEVEL SECURITY/],
    ['TUT-text-only favicon', />\s*TUT\s*</],
  ];
  for (const [label, pattern] of prohibited) {
    if (pattern.test(content)) violations.push(`${file}: ${label}`);
  }
}

const brandModule = await readFile(path.join(root, 'src', 'brand', 'index.ts'), 'utf8');
if (!brandModule.includes("@/assets/Campus safety forum logo design(1).png")) {
  violations.push('src/brand/index.ts: supplied CCSF logo is not the canonical import');
}

try {
  const [suppliedLogo, publicLogo, compatibilityLogo] = await Promise.all([
    readFile(path.join(root, suppliedLogoPath)),
    readFile(path.join(root, publicLogoPath)),
    readFile(path.join(root, 'src', 'assets', 'ccsf-logo.png')),
  ]);
  if (!suppliedLogo.equals(publicLogo)) violations.push('public/ccsf-logo.png: does not exactly match the transparent canonical CCSF logo');
  if (!suppliedLogo.equals(compatibilityLogo)) violations.push('src/assets/ccsf-logo.png: compatibility copy does not exactly match the transparent canonical CCSF logo');
  const canonicalInfo = decodePng(suppliedLogo, suppliedLogoPath);
  if (canonicalInfo.minAlpha !== 0 || canonicalInfo.maxAlpha !== 255) {
    violations.push(`${suppliedLogoPath}: canonical logo must contain genuine transparency and opaque artwork`);
  }
} catch {
  violations.push('transparent canonical CCSF logo or public compatibility copy is missing');
}

for (const obsoleteAsset of [
  path.join('src', 'assets', 'ccsf-logo.svg'),
  path.join('public', 'ccsf-logo.svg'),
  path.join('public', 'favicon.svg'),
]) {
  try {
    await access(path.join(root, obsoleteAsset), constants.F_OK);
    violations.push(`${obsoleteAsset}: generated placeholder asset still exists`);
  } catch {
    // Expected.
  }
}

await verifyPng('public/app-icon-1024.png', 1024, [0.74, 0.82]);
await verifyPng('public/app-icon-512.png', 512, [0.74, 0.82]);
await verifyPng('public/app-icon-192.png', 192, [0.74, 0.82]);
await verifyPng('public/maskable-icon-512.png', 512, [0.62, 0.70]);
await verifyPng('public/apple-touch-icon.png', 180, [0.74, 0.82]);
await verifyPng('public/favicon.png', 64, [0.80, 0.92]);
await verifyPng('public/favicon-32x32.png', 32, [0.80, 0.94]);
await verifyPng('public/favicon-16x16.png', 16, [0.80, 1]);

try {
  const ico = await readFile(path.join(root, 'public', 'favicon.ico'));
  const count = ico.readUInt16LE(4);
  const sizes = [];
  for (let index = 0; index < count; index += 1) {
    const offset = 6 + index * 16;
    sizes.push(ico[offset] || 256);
  }
  for (const expected of [16, 32, 48, 64]) {
    if (!sizes.includes(expected)) violations.push(`public/favicon.ico: missing ${expected}x${expected} image`);
  }
} catch {
  violations.push('public/favicon.ico: missing or invalid multi-size icon');
}

const indexHtml = await readFile(path.join(root, 'index.html'), 'utf8');
for (const reference of ['/favicon.ico', '/favicon-32x32.png', '/favicon-16x16.png', '/apple-touch-icon.png', '/manifest.json']) {
  if (!indexHtml.includes(reference)) violations.push(`index.html: missing ${reference}`);
}
if (indexHtml.includes('/app-icon-192.png" />')) {
  violations.push('index.html: 192px PWA icon is incorrectly used as the 180px Apple touch icon');
}

const manifest = JSON.parse(await readFile(path.join(root, 'public', 'manifest.json'), 'utf8'));
const iconContracts = new Map(manifest.icons.map((icon) => [icon.src, `${icon.sizes}:${icon.purpose}`]));
for (const [src, contract] of [
  ['/app-icon-192.png', '192x192:any'],
  ['/app-icon-512.png', '512x512:any'],
  ['/maskable-icon-512.png', '512x512:maskable'],
]) {
  if (iconContracts.get(src) !== contract) violations.push(`public/manifest.json: ${src} must declare ${contract}`);
}

const lockupConsumers = await Promise.all(
  files.filter((file) => file.endsWith('.tsx')).map(async (file) => ({ file, content: await readFile(path.join(root, file), 'utf8') })),
);
const lockupCount = lockupConsumers.reduce((total, { content }) => total + (content.match(/<InstitutionBrand\b/g)?.length ?? 0), 0);
if (lockupCount < 11) violations.push(`shared co-brand lockup appears ${lockupCount} times; expected at least 11`);

if (violations.length > 0) {
  console.error('Brand verification failed:\n' + violations.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log(`Brand verification passed: transparent canonical CCSF artwork, ChatGPT-scale optical footprint, platform-correct icons, ${lockupCount} CCSF + TUT lockups, and no prohibited legacy production references.`);
