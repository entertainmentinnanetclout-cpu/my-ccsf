import { supabase } from '@/integrations/supabase/client';
import { evidenceFileIdentity } from '@/lib/evidenceProcessing';

const TUS_VERSION = '1.0.0';
const TUS_CHUNK_SIZE = 6 * 1024 * 1024;
const RESUME_PREFIX = 'ccsf:tus-upload:v1';
const MAX_RESUME_AGE_MS = 23 * 60 * 60 * 1000;
const RETRY_DELAYS = [0, 1500, 3000, 5000, 10000];

interface ResumeRecord { url: string; createdAt: number; fileIdentity: string; bucket: string; path: string }
export interface ResumableUploadOptions { bucket: string; path: string; file: File; upsert?: boolean; signal?: AbortSignal; onProgress?: (uploadedBytes: number, totalBytes: number) => void }

function encodeMetadata(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}
function resumeKey(bucket: string, path: string, file: File): string { return `${RESUME_PREFIX}:${bucket}:${path}:${evidenceFileIdentity(file)}`; }
function readResume(key: string): ResumeRecord | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const record = JSON.parse(raw) as ResumeRecord;
    if (!record.url || Date.now() - record.createdAt > MAX_RESUME_AGE_MS) { localStorage.removeItem(key); return null; }
    return record;
  } catch { return null; }
}
function writeResume(key: string, record: ResumeRecord): void { try { localStorage.setItem(key, JSON.stringify(record)); } catch { /* best-effort */ } }
function clearResume(key: string): void { try { localStorage.removeItem(key); } catch { /* ignore */ } }
function resumableEndpoint(): string {
  const configured = import.meta.env.VITE_SUPABASE_URL as string;
  const url = new URL(configured);
  if (url.hostname.endsWith('.supabase.co') && !url.hostname.includes('.storage.')) {
    const projectRef = url.hostname.split('.')[0];
    return `${url.protocol}//${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
  }
  return `${url.origin}/storage/v1/upload/resumable`;
}
async function accessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw error ?? new Error('A valid sign-in session is required for evidence upload.');
  return data.session.access_token;
}
async function createUpload(options: ResumableUploadOptions, token: string): Promise<string> {
  const metadata = [
    `bucketName ${encodeMetadata(options.bucket)}`,
    `objectName ${encodeMetadata(options.path)}`,
    `contentType ${encodeMetadata(options.file.type || 'application/octet-stream')}`,
    `cacheControl ${encodeMetadata('3600')}`,
    `metadata ${encodeMetadata(JSON.stringify({ source: 'my-ccsf', originalName: options.file.name }))}`,
  ].join(',');
  const response = await fetch(resumableEndpoint(), {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'Tus-Resumable': TUS_VERSION, 'Upload-Length': String(options.file.size), 'Upload-Metadata': metadata, 'x-upsert': options.upsert ? 'true' : 'false' },
    signal: options.signal,
  });
  if (!response.ok) throw new Error(`Evidence upload could not start (${response.status}).`);
  const location = response.headers.get('location');
  if (!location) throw new Error('Evidence upload did not return a resumable location.');
  return new URL(location, resumableEndpoint()).toString();
}
async function currentOffset(url: string, token: string, signal?: AbortSignal): Promise<number | null> {
  const response = await fetch(url, { method: 'HEAD', headers: { authorization: `Bearer ${token}`, 'Tus-Resumable': TUS_VERSION }, signal });
  if (response.status === 404 || response.status === 410) return null;
  if (!response.ok) throw new Error(`Evidence upload could not resume (${response.status}).`);
  const value = Number(response.headers.get('upload-offset') ?? '0');
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
async function patchChunk(url: string, token: string, file: File, offset: number, signal?: AbortSignal): Promise<number> {
  const chunk = file.slice(offset, Math.min(file.size, offset + TUS_CHUNK_SIZE));
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${token}`, 'Tus-Resumable': TUS_VERSION, 'Upload-Offset': String(offset), 'Content-Type': 'application/offset+octet-stream' },
    body: chunk,
    signal,
  });
  if (!response.ok) throw new Error(`Evidence upload was interrupted (${response.status}).`);
  const next = Number(response.headers.get('upload-offset') ?? offset + chunk.size);
  if (!Number.isFinite(next) || next <= offset) throw new Error('Evidence upload returned an invalid progress offset.');
  return next;
}
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { window.clearTimeout(timer); reject(new DOMException('Upload aborted', 'AbortError')); }, { once: true });
  });
}
export async function uploadResumableEvidence(options: ResumableUploadOptions): Promise<{ path: string; resumed: boolean }> {
  const key = resumeKey(options.bucket, options.path, options.file);
  let token = await accessToken();
  let record = readResume(key);
  let resumed = Boolean(record);
  let url = record?.url ?? await createUpload(options, token);
  if (!record) { record = { url, createdAt: Date.now(), fileIdentity: evidenceFileIdentity(options.file), bucket: options.bucket, path: options.path }; writeResume(key, record); }
  let offset: number | null;
  try { offset = await currentOffset(url, token, options.signal); }
  catch { token = await accessToken(); offset = await currentOffset(url, token, options.signal).catch(() => null); }
  if (offset === null) {
    clearResume(key); resumed = false; url = await createUpload(options, token);
    writeResume(key, { url, createdAt: Date.now(), fileIdentity: evidenceFileIdentity(options.file), bucket: options.bucket, path: options.path });
    offset = 0;
  }
  options.onProgress?.(offset, options.file.size);
  while (offset < options.file.size) {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt += 1) {
      try {
        if (!navigator.onLine) throw new Error('No network connection. The evidence upload remains queued on this device.');
        if (RETRY_DELAYS[attempt]) await wait(RETRY_DELAYS[attempt], options.signal);
        offset = await patchChunk(url, token, options.file, offset, options.signal);
        options.onProgress?.(offset, options.file.size); lastError = null; break;
      } catch (error) {
        lastError = error;
        if (options.signal?.aborted) throw error;
        if (attempt === 1) { await supabase.auth.refreshSession().catch(() => undefined); token = await accessToken(); }
      }
    }
    if (lastError) throw lastError instanceof Error ? lastError : new Error('Evidence upload failed.');
  }
  clearResume(key);
  return { path: options.path, resumed };
}
