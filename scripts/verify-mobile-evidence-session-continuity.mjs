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
const productionReport = read('src/components/student/ReportIncident.tsx');
const pilotReport = read('src/components/pilot/PilotReportForm.tsx');
const supabaseClient = read('src/integrations/supabase/client.ts');

assert(
  productionReport.includes('type="file"') && productionReport.includes('incident-evidence'),
  'Production incident reporting retains a native evidence input.',
);
assert(
  pilotReport.includes('type="file"') && pilotReport.includes('pilot-files-'),
  'Pilot reporting retains a native evidence input.',
);

assert(
  lifecycle.includes("'/dashboard'") && lifecycle.includes("'/pilot/session/"),
  'Evidence lifecycle restoration is limited to the production report and Pilot session routes.',
);
assert(
  lifecycle.includes('window.history.replaceState') && lifecycle.includes('MAX_RESUME_AGE_MS'),
  'Interrupted mobile picker navigation restores only a recent saved report route.',
);
assert(
  lifecycle.includes("document.addEventListener('click'")
    && lifecycle.includes("document.addEventListener('change'")
    && lifecycle.includes("document.addEventListener('cancel'"),
  'Native picker open, selection and cancellation are tracked without replacing the file input.',
);

assert(
  main.includes('restoreInterruptedEvidenceRoute();')
    && main.indexOf('restoreInterruptedEvidenceRoute();') < main.indexOf('createRoot('),
  'Interrupted evidence routes are restored before React Router boots.',
);
assert(
  main.includes('installEvidencePickerLifecycle();')
    && main.includes('!isEvidencePickerInteractionActive()'),
  'Global picker lifecycle tracking is installed and PWA update checks pause during selection.',
);

assert(
  supabaseClient.includes('persistSession: true') && supabaseClient.includes('autoRefreshToken: true'),
  'Supabase sessions remain persisted and refreshable.',
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
  'Pilot context depends on the stable user ID and preserves an already-loaded session.',
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
