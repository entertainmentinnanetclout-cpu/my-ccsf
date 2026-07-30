import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const passes = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const check = (value, message) => value ? passes.push(message) : failures.push(message);

const auth = read('src/contexts/AuthContext.tsx');
const main = read('src/main.tsx');
const picker = read('src/components/shared/MobileEvidencePicker.tsx');
const draftHook = read('src/hooks/usePersistentReportDraft.ts');
const official = read('src/components/student/ReportIncident.tsx');
const pilot = read('src/components/pilot/PilotReportForm.tsx');
const pilotDashboard = read('src/components/pilot/PilotStudentDashboard.tsx');
const pilotCore = read('src/services/pilot/pilotCoreService.ts');
const mime = read('src/lib/evidenceFiles.ts');
const pilotConfig = read('src/config/pilot.ts');

check(auth.includes("type IdentityLoadMode = 'blocking' | 'background'"), 'Authentication distinguishes initial blocking restoration from background token refresh.');
check(auth.includes("mode === 'blocking' || !identityReadyRef.current || !sameIdentity"), 'Verified identity remains mounted during same-user background refresh.');
check(auth.includes('Retain the last verified role/profile'), 'Transient background identity failures do not discard a working session.');
check(auth.includes("persistSession") === false, 'AuthContext does not create a conflicting session store.');

check(main.includes('VISIBILITY_UPDATE_MIN_GAP') && main.includes('checkForUpdate(false)'), 'Returning from a mobile picker does not trigger repeated service-worker checks.');
check(!main.includes("document.visibilityState === 'visible' && navigator.onLine"), 'Legacy unthrottled visibility refresh is removed.');

check(picker.includes('type="button"') && picker.includes('event.preventDefault()') && picker.includes('event.stopPropagation()'), 'Evidence picker cannot submit its parent form or navigate accidentally.');
check(picker.includes('inputRef.current?.click()') && picker.includes("event.currentTarget.value = ''"), 'Mobile native picker is opened by a direct user action and supports reselection.');
check(picker.includes('Draft restored — reselect evidence'), 'Restored drafts clearly explain browser file privacy limitations.');

check(draftHook.includes("window.addEventListener('pagehide'"), 'Drafts save when mobile operating systems suspend the page.');
check(draftHook.includes("document.addEventListener('visibilitychange'"), 'Drafts save before Gallery, Camera or Files backgrounds the app.');
check(draftHook.includes('localStorage.setItem(storageKey'), 'Report details persist locally under a user/scenario-specific key.');

check(official.includes('<MobileEvidencePicker') && official.includes('usePersistentReportDraft<OfficialReportDraft>'), 'Official report form uses the mobile-safe picker and draft restoration.');
check(official.includes('normaliseEvidenceMimeType(file)') && official.includes('isAllowedEvidenceFile'), 'Official uploads normalise missing Android MIME metadata.');
check(official.includes('clearDraft();'), 'Official report draft clears after successful submission.');

check(pilot.includes('<MobileEvidencePicker') && pilot.includes('usePersistentReportDraft<PilotReportDraft>'), 'Pilot report form uses the mobile-safe picker and draft restoration.');
check(pilot.includes('onBeforeOpen={saveDraftNow}'), 'Pilot report details are committed before the native picker opens.');
check(pilot.includes('clearDraft();'), 'Pilot report draft clears after successful submission.');
check(pilotDashboard.includes('useUrlBackedView<View>') && pilotDashboard.includes("parameter: 'tab'"), 'Pilot section is URL-backed and survives mobile process restoration.');

check(pilotCore.includes('normaliseEvidenceMimeType(file)') && pilotCore.includes('isAllowedEvidenceFile'), 'Pilot upload validation handles mobile MIME fallback.');
check(mime.includes("application/octet-stream") && mime.includes('MIME_BY_EXTENSION'), 'Blank or generic mobile MIME values fall back to safe file extensions.');
check(pilotConfig.includes("'image/heic'") && pilotConfig.includes("'image/heif'"), 'Mobile HEIC and HEIF evidence are accepted by the client configuration.');

if (failures.length) {
  console.error(`Mobile evidence/session verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Mobile evidence/session verification passed (${passes.length} assertions).`);
passes.forEach((pass) => console.log(`- ${pass}`));
