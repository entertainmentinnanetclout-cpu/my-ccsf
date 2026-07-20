import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const migrationPath = 'scripts/apply-super-admin-student-cases.mjs';
let source = fs.readFileSync(migrationPath, 'utf8');

const fixes = [
  [
    "{identity?.year_of_study ? ` · Year ${identity.year_of_study}` : ''}",
    "{identity?.year_of_study ? \\` · Year \\${identity.year_of_study}\\` : ''}",
  ],
  [
    "aria-label={`Open case ${report.reference_number}`}",
    "aria-label={\\`Open case \\${report.reference_number}\\`}",
  ],
];

for (const [invalid, corrected] of fixes) {
  if (source.includes(invalid)) source = source.replace(invalid, corrected);
}

fs.writeFileSync(migrationPath, source);
await import(`${pathToFileURL(migrationPath).href}?run=${Date.now()}`);
