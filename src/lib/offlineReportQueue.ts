const DB_NAME = 'ccsf-offline-report-queue-v1';
const STORE_NAME = 'submissions';
const QUEUE_EVENT = 'ccsf:offline-report-queue-change';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface StoredFile {
  blob: Blob;
  name: string;
  type: string;
  lastModified: number;
}

interface StoredQueuedSubmission {
  id: string;
  scope: 'official' | 'pilot';
  userId: string;
  payload: Record<string, unknown>;
  context: Record<string, unknown>;
  files: StoredFile[];
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  lastError: string | null;
}

export interface QueuedSubmission extends Omit<StoredQueuedSubmission, 'files'> {
  files: File[];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        const store = request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('user_scope', ['userId', 'scope'], { unique: false });
        store.createIndex('expires_at', 'expiresAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Offline report storage could not be opened.'));
  });
}

function asQueued(record: StoredQueuedSubmission): QueuedSubmission {
  return {
    ...record,
    files: record.files.map((item) => new File([item.blob], item.name, {
      type: item.type || item.blob.type,
      lastModified: item.lastModified,
    })),
  };
}

function notifyQueueChanged(): void {
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
}

export function subscribeOfflineQueue(listener: () => void): () => void {
  window.addEventListener(QUEUE_EVENT, listener);
  return () => window.removeEventListener(QUEUE_EVENT, listener);
}

export async function enqueueOfflineSubmission(input: {
  scope: 'official' | 'pilot';
  userId: string;
  payload: Record<string, unknown>;
  context?: Record<string, unknown>;
  files?: File[];
}): Promise<QueuedSubmission> {
  const database = await openDatabase();
  const now = Date.now();
  const record: StoredQueuedSubmission = {
    id: crypto.randomUUID(),
    scope: input.scope,
    userId: input.userId,
    payload: input.payload,
    context: input.context ?? {},
    files: (input.files ?? []).map((file) => ({
      blob: file,
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
    })),
    createdAt: now,
    updatedAt: now,
    expiresAt: now + MAX_AGE_MS,
    lastError: null,
  };

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const request = transaction.objectStore(STORE_NAME).put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('The offline report could not be saved.'));
    transaction.oncomplete = () => database.close();
  });
  notifyQueueChanged();
  return asQueued(record);
}

export async function listOfflineSubmissions(userId: string, scope?: 'official' | 'pilot'): Promise<QueuedSubmission[]> {
  const database = await openDatabase();
  const records = await new Promise<StoredQueuedSubmission[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result ?? []) as StoredQueuedSubmission[]);
    request.onerror = () => reject(request.error ?? new Error('Offline reports could not be loaded.'));
    transaction.oncomplete = () => database.close();
  });

  const now = Date.now();
  const expired = records.filter((record) => record.expiresAt <= now).map((record) => record.id);
  await Promise.all(expired.map((id) => deleteOfflineSubmission(id)));
  return records
    .filter((record) => record.userId === userId && record.expiresAt > now && (!scope || record.scope === scope))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(asQueued);
}

export async function deleteOfflineSubmission(id: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const request = transaction.objectStore(STORE_NAME).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('The queued report could not be removed.'));
    transaction.oncomplete = () => database.close();
  });
  notifyQueueChanged();
}

export async function setOfflineSubmissionError(id: string, lastError: string | null): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      const record = request.result as StoredQueuedSubmission | undefined;
      if (!record) { resolve(); return; }
      const update = store.put({ ...record, lastError, updatedAt: Date.now() });
      update.onsuccess = () => resolve();
      update.onerror = () => reject(update.error ?? new Error('The queued report could not be updated.'));
    };
    request.onerror = () => reject(request.error ?? new Error('The queued report could not be read.'));
    transaction.oncomplete = () => database.close();
  });
  notifyQueueChanged();
}
