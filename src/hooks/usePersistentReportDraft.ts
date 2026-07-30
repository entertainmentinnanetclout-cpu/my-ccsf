import { useCallback, useEffect, useRef, useState } from 'react';

interface StoredReportDraft<T> {
  version: 1;
  savedAt: string;
  data: T;
  evidenceNames: string[];
}

interface PersistentReportDraftOptions<T> {
  storageKey: string | null;
  value: T;
  evidenceNames?: string[];
  enabled?: boolean;
  onRestore: (data: T, evidenceNames: string[], savedAt: string) => void;
  debounceMs?: number;
}

function parseDraft<T>(raw: string | null): StoredReportDraft<T> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredReportDraft<T>>;
    if (parsed.version !== 1 || !parsed.savedAt || parsed.data === undefined) return null;
    return {
      version: 1,
      savedAt: parsed.savedAt,
      data: parsed.data,
      evidenceNames: Array.isArray(parsed.evidenceNames)
        ? parsed.evidenceNames.filter((name): name is string => typeof name === 'string')
        : [],
    };
  } catch {
    return null;
  }
}

export function usePersistentReportDraft<T>({
  storageKey,
  value,
  evidenceNames = [],
  enabled = true,
  onRestore,
  debounceMs = 300,
}: PersistentReportDraftOptions<T>) {
  const latestRef = useRef({ value, evidenceNames });
  const onRestoreRef = useRef(onRestore);
  const restoredKeyRef = useRef<string | null>(null);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [restoredEvidenceNames, setRestoredEvidenceNames] = useState<string[]>([]);

  latestRef.current = { value, evidenceNames };
  onRestoreRef.current = onRestore;

  const saveNow = useCallback(() => {
    if (!enabled || !storageKey) return;
    try {
      const payload: StoredReportDraft<T> = {
        version: 1,
        savedAt: new Date().toISOString(),
        data: latestRef.current.value,
        evidenceNames: latestRef.current.evidenceNames,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to save the local CCSF report draft.', error);
    }
  }, [enabled, storageKey]);

  const clearDraft = useCallback(() => {
    if (storageKey) localStorage.removeItem(storageKey);
    setRestoredAt(null);
    setRestoredEvidenceNames([]);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || restoredKeyRef.current === storageKey) return;
    restoredKeyRef.current = storageKey;
    const stored = parseDraft<T>(localStorage.getItem(storageKey));
    if (!stored) return;
    setRestoredAt(stored.savedAt);
    setRestoredEvidenceNames(stored.evidenceNames);
    onRestoreRef.current(stored.data, stored.evidenceNames, stored.savedAt);
  }, [storageKey]);

  useEffect(() => {
    if (!enabled || !storageKey || restoredKeyRef.current !== storageKey) return;
    const timer = window.setTimeout(saveNow, debounceMs);
    return () => window.clearTimeout(timer);
  }, [debounceMs, enabled, evidenceNames, saveNow, storageKey, value]);

  useEffect(() => {
    if (!enabled || !storageKey) return undefined;
    const handlePageHide = () => saveNow();
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, saveNow, storageKey]);

  return { saveNow, clearDraft, restoredAt, restoredEvidenceNames };
}
