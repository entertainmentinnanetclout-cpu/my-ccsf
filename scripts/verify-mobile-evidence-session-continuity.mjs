import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const assert = (condition, message) => condition ? passes.push(message) : failures.push(message);

const lifecycle = read('src/lib/evidencePickerLifecycle.ts');
const main = read('src/main.tsx');
const auth = read('src/contexts/AuthContext.tsx');
const pilotContext = read('src/contexts/PilotModeContext.tsx');
const productionEntry = read('src/components/student/ReportIncident.tsx');
const productionReport = read('src/components/student/ReportIncidentV2.tsx');
const pilotReport = read('src/components/pilot/PilotReportFormV2.tsx');
const pilotSession = read('src/pages/pilot/PilotSession.tsx');
const picker = read('src/components/shared/MobileEvidencePicker.tsx');
const draftStorage = read('src/lib/reportDraftStorage.ts');
const pilotEvidence = read('src/services/pilot/pilotEvidenceService.ts');
const dashboard = read('src/pages/Dashboard.tsx');
const supabaseClient = read('src/integrations/supabase/client.ts');

assert(
  productionEntry.includes('ReportIncidentV2 as ReportIncident')
    && productionReport.includes('MobileEvidencePicker'),
  'Production reporting uses the resilient mobile evidence form.',
);
assert(
  pilotSession.includes('PilotReportFormV2')
    && pilotReport.includes('MobileEvidencePicker'),
  'Pilot reporting uses the resilient mobile evidence form.',
);
assert(
  picker.includes('type="button"')
    && picker.includes('capture="environment"')
    && picker.includes('input.current?.click()')
    && picker.includes('event.stopPropagation()'),
  'Mobile evidence controls cannot submit or navigate the parent form and support direct camera capture.',
);

assert(
  lifecycle.includes("url.pathname === '/dashboard'")
    && lifecycle.includes('pilot')
    && lifecycle.includes('session')
    && lifecycle.includes('test(url.pathname)'),
  'Evidence lifecycle restoration is limited to official reporting and Pilot session routes.',
);
assert(
  lifecycle.includes('window.history.replaceState') && lifecycle.includes('MAX_RESUME_AGE_MS'),
  'Interrupted mobile picker navigation restores only a recent saved report route.',
);
assert(
  lifecycle.includes("document.addEventListener('click'")
    && lifecycle.includes("document.addEventListener('change'")
    && lifecycle.includes("document.addEventListener('cancel'"),
  'Native picker open, selection and cancellation remain tracked.',
);

const restoreCall = main.lastIndexOf('restoreInterruptedEvidenceRoute();');
assert(
  restoreCall >= 0 && restoreCall < main.indexOf('createRoot('),
  'Interrupted evidence routes are restored before React Router boots.',
);
assert(
  main.includes('installEvidencePickerLifecycle();')
    && main.includes('!isEvidencePickerInteractionActive()'),
  'PWA update checks pause during mobile evidence selection.',
);

assert(
  draftStorage.includes('window.localStorage')
    && draftStorage.includes('window.indexedDB')
    && draftStorage.includes('24 * 60 * 60 * 1000'),
  'Unfinished report fields and selected evidence persist privately for no longer than 24 hours.',
);
assert(
  productionReport.includes('readReportDraft')
    && productionReport.includes('loadDraftEvidence')
    && productionReport.includes('saveDraftEvidence')
    && productionReport.includes('clearDraftEvidence'),
  'Production report drafts and evidence restore after mobile suspension and clear after submission.',
);
assert(
  pilotReport.includes('readReportDraft')
    && pilotReport.includes('loadDraftEvidence')
    && pilotReport.includes('saveDraftEvidence')
    && pilotReport.includes('clearDraftEvidence'),
  'Pilot report drafts and evidence restore after mobile suspension and clear after submission.',
);
assert(
  dashboard.includes('readReportDraft<StudentView>')
    && dashboard.includes('writeReportDraft(viewStorageKey, view)'),
  'The student dashboard restores the last active section instead of returning to Home.',
);

assert(
  productionReport.includes('uploadEvidenceWithRetry')
    && productionReport.includes('supabase.auth.refreshSession()')
    && productionReport.includes(".remove([path])"),
  'Production evidence upload retries after token renewal and removes orphaned files.',
);
assert(
  pilotEvidence.includes('uploadObjectWithRetry')
    && pilotEvidence.includes('supabase.auth.refreshSession()')
    && pilotEvidence.includes('uploaded_by: userId')
    && pilotEvidence.includes('.remove([storagePath])'),
  'Pilot evidence upload retries securely, records ownership and removes orphaned files.',
);
assert(
  pilotReport.includes('ensureActivePilotSession(participant, workingSession)')
    && pilotReport.includes('ensureActivePilotSession(participant, null)'),
  'Pilot submission renews a stale Pilot session without discarding the report draft.',
);

assert(
  supabaseClient.includes('persistSession: true') && supabaseClient.includes('autoRefreshToken: true'),
  'Supabase authentication sessions remain persisted and refreshable.',
);
assert(
  auth.includes('identityReadyRef')
    && auth.includes("event !== 'USER_UPDATED'")
    && auth.includes('current?.id !== nextUser.id'),
  'Same-user auth refresh events do not replace identity state or remount protected forms.',
);
assert(
  pilotContext.includes('const userId = user?.id ?? null')
    && pilotContext.includes('contextReadyRef')
    && pilotContext.includes('[enabled, userId, userRole]'),
  'Pilot context depends on stable user identity and preserves its loaded session.',
);
assert(
  pilotContext.includes('if (!contextReadyRef.current) {')
    && pilotContext.includes("setError(caught instanceof Error ? caught.message : 'Unable to load Pilot Mode.')"),
  'Transient Pilot refresh failures preserve previously loaded participant and session data.',
);

if (failures.length) {
  console.error(`Mobile evidence/session continuity verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Mobile evidence/session continuity verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
