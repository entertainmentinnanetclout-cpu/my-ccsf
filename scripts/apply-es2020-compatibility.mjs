import { readFileSync, writeFileSync } from 'node:fs';

const replacements = new Map([
  ["id.replaceAll('-', '')", "id.replace(/-/g, '')"],
  [".replaceAll('&', '&amp;')", ".replace(/&/g, '&amp;')"],
  [".replaceAll('<', '&lt;')", ".replace(/</g, '&lt;')"],
  [".replaceAll('>', '&gt;')", ".replace(/>/g, '&gt;')"],
  [`.replaceAll('"', '&quot;')`, `.replace(/"/g, '&quot;')`],
  [`.replaceAll("'", '&#039;')`, `.replace(/'/g, '&#039;')`],
  ["poi.confidence.replaceAll('_', ' ')", "poi.confidence.replace(/_/g, ' ')"],
]);

for (const file of [
  'src/components/student/InstitutionalCampusRadar.tsx',
  'src/components/student/InstitutionalCaseReports.tsx',
]) {
  let source = readFileSync(file, 'utf8');
  for (const [from, to] of replacements) source = source.split(from).join(to);
  if (source.includes('.replaceAll(')) throw new Error(`Unsupported replaceAll remains in ${file}.`);
  writeFileSync(file, source);
}

console.log('Institutional surfaces are compatible with the current ES2020 TypeScript target.');
