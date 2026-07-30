const REPORT_DRAFT_PREFIX = 'ccsf-report-draft-v1';
const EVIDENCE_DB_NAME = 'ccsf-report-evidence-v1';
const EVIDENCE_STORE_NAME = 'drafts';
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface StoredDraft<T> {
  value: T;
  updatedAt: number;
}

interface StoredEvidenceFile {
  blob: Blob;
  name: string;
  type: string;
  lastModified: number;
}

interface StoredEvidenceDraft {
  key: string;
  files: StoredEvidenceFile[];
  updatedAt: number;
}

const hasWindow = () => typeof window !== 'undefined';

export function reportDraftKey(scope: 'official' | 'pilot', userId: string, contextId = 'default'): string {
  return `${REPORT_DRAFT_PREFIX}:${scope}:${userId}:${contextId}`;
}

export function readReportDraft<T>(key: string, maxAgeMs = DEFAULT_MAX_AGE_MS): T | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (!parsed || typeof parsed.updatedAt !== 'number' || Date.now() - parsed.updatedAt > maxAgeMs) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

export function writeReportDraft<T>(key: string, value: T): void {
  if (!hasWindow()) return;
  try {
    const payload: StoredDraft<T> = { value, updatedAt: Date.now() };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // A draft is a resilience aid. Reporting must remain usable when storage is unavailable.
  }
}

export function clearReportDraft(key: string): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function openEvidenceDatabase(): Promise<IDBDatabase | null> {
  if (!hasWindow() || !('indexedDB' in window)) return Promise.resolve(null);

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(EVIDENCE_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(EVIDENCE_STORE_NAME)) {
          database.createObjectStore(EVIDENCE_STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function transactEvidence<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, resolve: (value: T) => void) => void,
  fallback: T,
): Promise<T> {
  return openEvidenceDatabase().then((database) => {
    if (!database) return fallback;

    return new Promise<T>((resolve) => {
      try {
        const transaction = database.transaction(EVIDENCE_STORE_NAME, mode);
        const store = transaction.objectStore(EVIDENCE_STORE_NAME);
        operation(store, resolve);
        transaction.onerror = () => resolve(fallback);
        transaction.onabort = () => resolve(fallback);
        transaction.oncomplete = () => database.close();
      } catch {
        database.close();
        resolve(fallback);
      }
    });
  });
}

export async function saveDraftEvidence(key: string, files: File[]): Promise<void> {
  if (!files.length) {
    await clearDraftEvidence(key);
    return;
  }

  const record: StoredEvidenceDraft = {
    key,
    updatedAt: Date.now(),
    files: files.map((file) => ({
      blob: file,
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
    })),
  };

  await transactEvidence<void>('readwrite', (store, resolve) => {
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  }, undefined);
}

export async function loadDraftEvidence(key: string, maxAgeMs = DEFAULT_MAX_AGE_MS): Promise<File[]> {
  return transactEvidence<File[]>('readonly', (store, resolve) => {
    const request = store.get(key);
    request.onsuccess = () => {
      const record = request.result as StoredEvidenceDraft | undefined;
      if (!record || Date.now() - record.updatedAt > maxAgeMs) {
        resolve([]);
        void clearDraftEvidence(key);
        return;
      }

      resolve(record.files.map((item) => new File([item.blob], item.name, {
        type: item.type || item.blob.type,
        lastModified: item.lastModified,
      })));
    };
    request.onerror = () => resolve([]);
  }, []);
}

export async function clearDraftEvidence(key: string): Promise<void> {
  await transactEvidence<void>('readwrite', (store, resolve) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  }, undefined);
}
