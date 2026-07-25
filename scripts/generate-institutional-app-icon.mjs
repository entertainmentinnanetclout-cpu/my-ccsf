import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve('src/assets/Campus safety forum logo design(1).png');
const output = path.resolve('public/app-icon.svg');
if (!fs.existsSync(source)) throw new Error(`Approved CCSF logo asset is missing: ${source}`);

const logo = fs.readFileSync(source).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="title desc">
  <title id="title">My CCSF application icon</title>
  <desc id="desc">Approved Campus Community Safety Forum logo presented on a permanent white application-icon background.</desc>
  <defs>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#002F6C" flood-opacity=".24"/></filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="#ffffff"/>
  <rect x="18" y="18" width="476" height="476" rx="96" fill="none" stroke="#002F6C" stroke-width="22"/>
  <rect x="43" y="43" width="426" height="426" rx="76" fill="#ffffff" stroke="#F2A900" stroke-width="5" filter="url(#shadow)"/>
  <image href="data:image/png;base64,${logo}" x="83" y="72" width="346" height="346" preserveAspectRatio="xMidYMid meet"/>
  <rect x="118" y="410" width="276" height="48" rx="24" fill="#002F6C"/>
  <text x="256" y="442" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" font-weight="900" letter-spacing="3" fill="#ffffff">MY CCSF</text>
</svg>`;

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, svg);
console.log(`Generated ${path.relative(process.cwd(), output)} from the approved CCSF logo.`);
