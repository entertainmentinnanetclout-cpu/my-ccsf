const EVIDENCE_PICKER_RESUME_KEY = 'ccsf:evidence-picker-resume:v1';
const MAX_RESUME_AGE_MS = 10 * 60 * 1000;
const RETURN_SETTLE_DELAY_MS = 1500;

interface EvidencePickerResumeMarker {
  path: string;
  startedAt: number;
}

let lifecycleInstalled = false;
let settleTimer: number | null = null;

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function isSafeEvidencePath(candidate: string): boolean {
  try {
    const url = new URL(candidate, window.location.origin);
    if (url.origin !== window.location.origin) return false;

    if (url.pathname === '/dashboard' || url.pathname === '/pilot') {
      return url.searchParams.get('tab') === 'report';
    }

    return /^\/pilot\/session\/[^/]+$/.test(url.pathname);
  } catch {
    return false;
  }
}

function readMarker(): EvidencePickerResumeMarker | null {
  try {
    const raw = window.localStorage.getItem(EVIDENCE_PICKER_RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EvidencePickerResumeMarker>;
    if (typeof parsed.path !== 'string' || typeof parsed.startedAt !== 'number') {
      window.localStorage.removeItem(EVIDENCE_PICKER_RESUME_KEY);
      return null;
    }
    if (!isSafeEvidencePath(parsed.path) || Date.now() - parsed.startedAt > MAX_RESUME_AGE_MS) {
      window.localStorage.removeItem(EVIDENCE_PICKER_RESUME_KEY);
      return null;
    }
    return { path: parsed.path, startedAt: parsed.startedAt };
  } catch {
    return null;
  }
}

function writeMarker(path: string): void {
  if (!isSafeEvidencePath(path)) return;
  try {
    window.localStorage.setItem(EVIDENCE_PICKER_RESUME_KEY, JSON.stringify({ path, startedAt: Date.now() } satisfies EvidencePickerResumeMarker));
  } catch {
    // Storage can be unavailable in restrictive browser modes. The native picker still works.
  }
}

export function clearEvidencePickerResumeMarker(): void {
  try { window.localStorage.removeItem(EVIDENCE_PICKER_RESUME_KEY); } catch { /* Ignore storage failures. */ }
}

export function isEvidencePickerInteractionActive(): boolean {
  return readMarker() !== null;
}

export function restoreInterruptedEvidenceRoute(): void {
  if (typeof window === 'undefined') return;
  const marker = readMarker();
  if (!marker || marker.path === currentPath()) return;

  const current = new URL(window.location.href);
  const looksLikeResetDestination = current.pathname === '/'
    || current.pathname === '/pilot'
    || (current.pathname === '/dashboard' && current.searchParams.get('tab') !== 'report');

  if (looksLikeResetDestination) window.history.replaceState(window.history.state, '', marker.path);
}

function isFileInput(target: EventTarget | null): target is HTMLInputElement {
  return target instanceof HTMLInputElement && target.type === 'file';
}

function scheduleMarkerClearAfterReturn(): void {
  const marker = readMarker();
  if (!marker || currentPath() !== marker.path) return;
  if (settleTimer !== null) window.clearTimeout(settleTimer);
  settleTimer = window.setTimeout(() => {
    clearEvidencePickerResumeMarker();
    settleTimer = null;
  }, RETURN_SETTLE_DELAY_MS);
}

export function installEvidencePickerLifecycle(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined' || lifecycleInstalled) return;
  lifecycleInstalled = true;

  document.addEventListener('click', (event) => {
    if (!isFileInput(event.target)) return;
    writeMarker(currentPath());
  }, true);
  document.addEventListener('change', (event) => {
    if (isFileInput(event.target)) clearEvidencePickerResumeMarker();
  }, true);
  document.addEventListener('cancel', (event) => {
    if (isFileInput(event.target)) clearEvidencePickerResumeMarker();
  }, true);
  window.addEventListener('focus', scheduleMarkerClearAfterReturn);
  window.addEventListener('pageshow', scheduleMarkerClearAfterReturn);
}
