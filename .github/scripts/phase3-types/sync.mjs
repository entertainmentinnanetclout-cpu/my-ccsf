import fs from 'node:fs';
import specsA from './specs-a.mjs';
import specsB from './specs-b.mjs';
import { pilotFunctionsBlock, pilotEnumsBlock, pilotConstantsBlock } from './blocks.mjs';

const path = 'src/integrations/supabase/types.ts';
let source = fs.readFileSync(path, 'utf8');
const tables = [...specsA, ...specsB];

const renderTable = (spec) => {
  const row = spec.fields.map(([name, type]) => `          ${name}: ${type}`).join('\n');
  const insert = spec.fields.map(([name, type, required]) => `          ${name}${required ? '' : '?'}: ${type}`).join('\n');
  const update = spec.fields.map(([name, type]) => `          ${name}?: ${type}`).join('\n');
  const relationships = spec.relationships.map(([key, column, relation]) => `          {
            foreignKeyName: "${key}"
            columns: ["${column}"]
            isOneToOne: false
            referencedRelation: "${relation}"
            referencedColumns: ["id"]
          },`).join('\n');
  return `      ${spec.name}: {
        Row: {
${row}
        }
        Insert: {
${insert}
        }
        Update: {
${update}
        }
        Relationships: [
${relationships}
        ]
      }
`;
};

source = source.replace(/PostgrestVersion:\s*"[^"]+"/, 'PostgrestVersion: "13.0.5"');

if (!source.includes('      pilot_attachments: {')) {
  const marker = '      profiles: {';
  if (!source.includes(marker)) throw new Error('profiles table marker missing');
  source = source.replace(marker, tables.map(renderTable).join('') + marker);
}

if (!source.includes('      pilot_add_report_note: {')) {
  const marker = '      remove_campus_admin: {';
  if (!source.includes(marker)) throw new Error('functions marker missing');
  source = source.replace(marker, pilotFunctionsBlock + marker);
}

const constantsIndex = source.indexOf('export const Constants =');
if (constantsIndex < 0) throw new Error('Constants marker missing');
let beforeConstants = source.slice(0, constantsIndex);
let constantsSection = source.slice(constantsIndex);

if (!beforeConstants.includes('      pilot_event_type:\n')) {
  const marker = '      residence_name:';
  if (!beforeConstants.includes(marker)) throw new Error('enum marker missing');
  beforeConstants = beforeConstants.replace(marker, pilotEnumsBlock + marker);
}

if (!constantsSection.includes('      pilot_event_type: [')) {
  const marker = '      residence_name: [';
  if (!constantsSection.includes(marker)) throw new Error('enum constants marker missing');
  constantsSection = constantsSection.replace(marker, pilotConstantsBlock + marker);
}

source = beforeConstants + constantsSection;

for (const expected of [
  '      pilot_programs: {',
  '      pilot_transition_report: {',
  '      pilot_program_status:',
  '      pilot_program_status: [',
  'PostgrestVersion: "13.0.5"',
]) {
  if (!source.includes(expected)) throw new Error(`Missing generated type content: ${expected}`);
}

fs.writeFileSync(path, source);
console.log('Phase 3 pilot types synchronised.');
