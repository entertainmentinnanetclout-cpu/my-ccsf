import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content);

function replaceIfPresent(source, search, replacement) {
  return source.includes(search) ? source.replace(search, replacement) : source;
}

function requireText(source, path, expected) {
  if (!source.includes(expected)) {
    throw new Error(`Expected final text missing in ${path}: ${expected.slice(0, 100)}`);
  }
}

// Keep frontend staff-password rules aligned with the privileged Edge Function.
{
  const path = 'src/components/admin/CampusAdminManager.tsx';
  let source = read(path);
  source = replaceIfPresent(
    source,
    'if (createFormData.password.length < 6) {',
    'if (createFormData.password.length < 12) {',
  );
  source = replaceIfPresent(
    source,
    "title: 'Password must be at least 6 characters'",
    "title: 'Password must be at least 12 characters'",
  );
  requireText(source, path, 'if (createFormData.password.length < 12) {');
  write(path, source);
}

// Synchronise the checked-in Supabase types with the Phase 1.5 live schema changes.
{
  const path = 'src/integrations/supabase/types.ts';
  let types = read(path);

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
    incidents = incidents.replaceAll(
      '          status?: Database["public"]["Enums"]["incident_status"]\n',
      '          status?: Database["public"]["Enums"]["incident_status"]\n          submitted_by?: string | null\n',
    );
    types = types.slice(0, incidentsStart) + incidents + types.slice(incidentsEnd);
  }

  requireText(types, path, '      app_settings: {');
  requireText(types, path, '      campus_emergency_contacts: {');
  requireText(types, path, '          submitted_by: string | null');
  write(path, types);
}

// Replace the unverified hard-coded number with the verified backend contact component.
{
  const path = 'src/components/student/EmergencyReport.tsx';
  let source = read(path);
  source = replaceIfPresent(
    source,
    "import { AlertTriangle, Phone, MapPin, Loader2, Radio, StopCircle } from 'lucide-react';",
    "import { AlertTriangle, MapPin, Loader2, Radio, StopCircle } from 'lucide-react';",
  );
  if (!source.includes("import { CampusEmergencyContact } from './CampusEmergencyContact';")) {
    source = source.replace(
      "import { Badge } from '@/components/ui/badge';",
      "import { Badge } from '@/components/ui/badge';\nimport { CampusEmergencyContact } from './CampusEmergencyContact';",
    );
  }
  source = replaceIfPresent(
    source,
    `            <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">\n              <Phone className="h-5 w-5 text-primary mt-0.5" />\n              <div>\n                <p className="text-sm font-medium">Campus Security</p>\n                <p className="text-sm text-muted-foreground">012 382 5911 / 5912</p>\n              </div>\n            </div>`,
    '            <CampusEmergencyContact />',
  );
  requireText(source, path, '<CampusEmergencyContact />');
  write(path, source);
}

// Store private chat-media object paths and resolve them through signed URLs.
{
  const path = 'src/components/admin/StaffCommunication.tsx';
  let source = read(path);

  if (!source.includes("import { resolveChatMediaUrl } from '@/lib/chatMedia';")) {
    source = source.replace(
      "import imageCompression from 'browser-image-compression';",
      "import imageCompression from 'browser-image-compression';\nimport { resolveChatMediaUrl } from '@/lib/chatMedia';",
    );
  }

  source = replaceIfPresent(
    source,
    `      } else if (msgs) {\n        // Fetch reactions for all messages\n        const messageIds = msgs.map(m => m.id);`,
    `      } else if (msgs) {\n        const resolvedMessages = await Promise.all(\n          msgs.map(async (message) => ({\n            ...message,\n            media_url: await resolveChatMediaUrl(message.media_url),\n          })),\n        );\n\n        // Fetch reactions for all messages\n        const messageIds = resolvedMessages.map(m => m.id);`,
  );
  source = replaceIfPresent(
    source,
    '        const messagesWithReactions = msgs.map(m => ({',
    '        const messagesWithReactions = resolvedMessages.map(m => ({',
  );
  source = replaceIfPresent(
    source,
    '        const senderIds = [...new Set(msgs.map(m => m.sender_id))];',
    '        const senderIds = [...new Set(resolvedMessages.map(m => m.sender_id))];',
  );
  source = replaceIfPresent(
    source,
    `          const newMsg = payload.new as ChatMessage;\n          \n          if (!userProfiles[newMsg.sender_id]) {`,
    `          const newMsg = payload.new as ChatMessage;\n          const resolvedNewMsg = {\n            ...newMsg,\n            media_url: await resolveChatMediaUrl(newMsg.media_url),\n          };\n          \n          if (!userProfiles[newMsg.sender_id]) {`,
  );
  source = replaceIfPresent(
    source,
    '          setMessages(prev => [...prev, { ...newMsg, reactions: [] }]);',
    '          setMessages(prev => [...prev, { ...resolvedNewMsg, reactions: [] }]);',
  );
  source = replaceIfPresent(
    source,
    `        const { data: urlData } = supabase.storage\n          .from('chat-media')\n          .getPublicUrl(fileName);\n        \n        mediaUrl = urlData.publicUrl;`,
    '        mediaUrl = fileName;',
  );

  requireText(source, path, "import { resolveChatMediaUrl } from '@/lib/chatMedia';");
  requireText(source, path, 'const resolvedMessages = await Promise.all(');
  requireText(source, path, 'mediaUrl = fileName;');
  write(path, source);
}

console.log('Phase 1.5 frontend synchronisation codemod completed.');
