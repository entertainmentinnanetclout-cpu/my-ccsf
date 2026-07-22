import fs from 'node:fs';
import path from 'node:path';
import { makePdf } from './pilot-document-library/pdf-generator.mjs';
import { makePptx } from './pilot-document-library/pptx-generator.mjs';

const outDir = path.resolve('public/downloads');
fs.mkdirSync(outDir, { recursive: true });
const pdf = makePdf(outDir);
const pptx = makePptx(outDir);
console.log(`Generated ${path.basename(pdf.file)} (${pdf.pages} pages, ${pdf.size} bytes)`);
console.log(`Generated ${path.basename(pptx.file)} (${pptx.slides} slides, ${pptx.size} bytes)`);
