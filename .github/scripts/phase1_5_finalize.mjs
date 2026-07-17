import fs from 'node:fs';

function replaceRequired(path, search, replacement) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(search)) {
    throw new Error(`Expected text not found in ${path}: ${search.slice(0, 80)}`);
  }
  fs.writeFileSync(path, source.replace(search, replacement));
}

// Keep frontend staff-password rules aligned with the privileged Edge Function.
replaceRequired(
  'src/components/admin/CampusAdminManager.tsx',
  'if (createFormData.password.length < 6) {',
  'if (createFormData.password.length < 12) {',
);
replaceRequired(
  'src/components/admin/CampusAdminManager.tsx',
  "title: 'Password must be at least 6 characters'",
  "title: 'Password must be at least 12 characters'",
);

// Synchronise the checked-in Supabase types with the Phase 1.5 live schema changes.
const typesPath = 'src/integrations/supabase/types.ts';
let types = fs.readFileSync(typesPath, 'utf8');

if (!types.includes('      app_settings: {')) {
  const marker = '      bento_layouts: {';
  const block = `      app_settings: {\n        Row: {\n          created_at: string\n          description: string | null\n          key: string\n          updated_at: string\n          updated_by: string | null\n          value: Json\n        }\n        Insert: {\n          created_at?: string\n          description?: string | null\n          key: string\n          updated_at?: string\n          updated_by?: string | null\n          value: Json\n        }\n        Update: {\n          created_at?: string\n          description?: string | null\n          key?: string\n          updated_at?: string\n          updated_by?: string | null\n          value?: Json\n        }\n        Relationships: []\n      }\n`;
  if (!types.includes(marker)) throw new Error('bento_layouts marker missing');
  types = types.replace(marker, block + marker);
}

if (!types.includes('      campus_emergency_contacts: {')) {
  const marker = '      campus_police_stations: {';
  const block = `      campus_emergency_contacts: {\n        Row: {\n          availability: string | null\n          campus: Database[\"public\"][\"Enums\"][\"campus_location\"] | null\n          created_at: string\n          extension: string | null\n          id: string\n          is_active: boolean\n          label: string\n          last_verified_at: string | null\n          phone_number: string\n          priority: number\n          service: string\n          updated_at: string\n          verified_by: string | null\n        }\n        Insert: {\n          availability?: string | null\n          campus?: Database[\"public\"][\"Enums\"][\"campus_location\"] | null\n          created_at?: string\n          extension?: string | null\n          id?: string\n          is_active?: boolean\n          label: string\n          last_verified_at?: string | null\n          phone_number: string\n          priority?: number\n          service: string\n          updated_at?: string\n          verified_by?: string | null\n        }\n        Update: {\n          availability?: string | null\n          campus?: Database[\"public\"][\"Enums\"][\"campus_location\"] | null\n          created_at?: string\n          extension?: string | null\n          id?: string\n          is_active?: boolean\n          label?: string\n          last_verified_at?: string | null\n          phone_number?: string\n          priority?: number\n          service?: string\n          updated_at?: string\n          verified_by?: string | null\n        }\n        Relationships: []\n      }\n`;
  if (!types.includes(marker)) throw new Error('campus_police_stations marker missing');
  types = types.replace(marker, block + marker);
}

const incidentsStart = types.indexOf('      incidents: {');
const incidentsEnd = types.indexOf('      message_reactions: {', incidentsStart);
if (incidentsStart < 0 || incidentsEnd < 0) throw new Error('incidents type block missing');
let incidents = types.slice(incidentsStart, incidentsEnd);

if (!incidents.includes('          submitted_by: string | null')) {
  incidents = incidents.replace(
    '          status: Database["public"]["Enums"]["incident_status"]\n',
    '          status: Database["public"]["Enums"]["incident_status"]\n          submitted_by: string | null\n',
  );
  incidents = incidents.replace(
    '          status?: Database["public"]["Enums"]["incident_status"]\n',
    '          status?: Database["public"]["Enums"]["incident_status"]\n          submitted_by?: string | null\n',
  );
  // The optional status line occurs in both Insert and Update, so replace the second block if needed.
  const firstSubmitted = incidents.indexOf('          submitted_by?: string | null');
  const secondStatus = incidents.indexOf(
    '          status?: Database["public"]["Enums"]["incident_status"]\n',
    firstSubmitted + 1,
  );
  if (secondStatus >= 0) {
    incidents = incidents.slice(0, secondStatus) +
      '          status?: Database["public"]["Enums"]["incident_status"]\n          submitted_by?: string | null\n' +
      incidents.slice(secondStatus + '          status?: Database["public"]["Enums"]["incident_status"]\n'.length);
  }
  types = types.slice(0, incidentsStart) + incidents + types.slice(incidentsEnd);
}

fs.writeFileSync(typesPath, types);
console.log('Phase 1.5 frontend synchronisation codemod completed.');
