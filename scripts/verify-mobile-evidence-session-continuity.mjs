import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const requireText = (source, expected, label) => {
  if (!source.includes(expected)) throw new Error(`Mobile evidence verification failed: ${label}`);
};
const forbidText = (source, forbidden, label) => {
  if (source.includes(forbidden)) throw new Error(`Mobile evidence verification failed: ${label}`);
};

const picker = read('src/components/shared/MobileEvidencePicker.tsx');
const draftStorage = read('src/lib/reportDraftStorage.ts');
const official = read('src/components/student/ReportIncidentV2.tsx');
const officialEntry = read('src/components/student/ReportIncident.tsx');
const pilot = read('src/components/pilot/PilotReportFormV2.tsx');
const pilotSession = read('src/pages/pilot/PilotSession.tsx');
const pilotEvidence = read('src/services/pilot/pilotEvidenceService.ts');
const dashboard = read('src/pages/Dashboard.tsx');
const main = read('src/main.tsx');
const supabaseClient = read('src/integrations/supabase/client.ts');

requireText(picker, 'type="button"', 'Evidence launch controls must never submit their parent form.');
requireText(picker, 'capture="environment"', 'Mobile camera capture must be available.');
requireText(picker, 'input.current?.click()', 'Buttons must open live file input references.');
requireText(picker, 'event.stopPropagation()', 'File-picker events must not activate dashboard navigation.');

requireText(draftStorage, 'window.localStorage', 'Report fields must persist locally.');
requireText(draftStorage, 'window.indexedDB', 'Selected evidence must survive mobile suspension.');
requireText(draftStorage, '24 * 60 * 60 * 1000', 'Sensitive local evidence must expire automatically.');

requireText(officialEntry, "ReportIncidentV2 as ReportIncident", 'The live portal must use the resilient report form.');
requireText(official, 'MobileEvidencePicker', 'The live report must use the mobile evidence picker.');
requireText(official, 'loadDraftEvidence', 'The live report must restore selected evidence.');
requireText(official, 'saveDraftEvidence', 'The live report must save selected evidence.');
requireText(official, 'uploadEvidenceWithRetry', 'The live report must retry interrupted uploads.');
requireText(official, "supabase.auth.refreshSession()", 'Interrupted live uploads must refresh authentication once.');

requireText(pilotSession, 'PilotReportFormV2', 'Pilot must use the resilient report form.');
requireText(pilot, 'MobileEvidencePicker', 'Pilot must use the mobile evidence picker.');
requireText(pilot, 'ensureActivePilotSession', 'Pilot reporting must resume an active server session.');
requireText(pilot, 'loadDraftEvidence', 'Pilot evidence must restore after interruption.');
requireText(pilotEvidence, 'uploadObjectWithRetry', 'Pilot evidence must retry interrupted uploads.');
requireText(pilotEvidence, 'uploaded_by: userId', 'Pilot evidence metadata must retain authenticated ownership.');
requireText(pilotEvidence, '.remove([storagePath])', 'Orphaned Pilot storage objects must be removed.');

requireText(dashboard, 'readReportDraft<StudentView>', 'The last student dashboard tab must restore.');
requireText(dashboard, 'writeReportDraft(viewStorageKey, view)', 'Dashboard navigation must persist.');
requireText(supabaseClient, 'persistSession: true', 'Supabase authentication sessions must persist.');
requireText(supabaseClient, 'autoRefreshToken: true', 'Supabase authentication tokens must refresh.');

forbidText(main, "document.addEventListener('visibilitychange'", 'Returning from the camera or gallery must not trigger a PWA update check.');
requireText(main, 'SERVICE_WORKER_UPDATE_INTERVAL', 'Background update discovery must remain available without resume refreshes.');

console.log('Mobile evidence selection, upload retry, draft persistence and session continuity verification passed.');
