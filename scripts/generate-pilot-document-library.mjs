import fs from 'node:fs';
import path from 'node:path';
import { makePublicDocuments } from './pilot-document-library/pdf-generator.mjs';

const outDir = path.resolve('public/downloads');
fs.mkdirSync(outDir, { recursive: true });

const privatePublicPath = path.join(outDir, 'CCSF-Crime-Prevention-Unit-Operating-Structure-Pilot-Activation-Plan-v1.1.pptx');
if (fs.existsSync(privatePublicPath)) fs.rmSync(privatePublicPath);

const documents = makePublicDocuments(outDir);
for (const document of documents) {
  console.log(`Generated ${path.basename(document.file)} (${document.pages} pages, ${document.size} bytes)`);
}
