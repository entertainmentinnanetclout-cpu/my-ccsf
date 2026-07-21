import { supabase } from '@/integrations/supabase/client';
import type { CampusLocation } from '@/types/pilot';
import type { PilotCarouselSlide, PilotGuideStep, PilotSafetyDocument } from '@/types/pilotExperience';
import type { PilotReviewCategoryOption, PilotReviewQuickCard } from '@/types/pilotReviews';

export const PILOT_CONTENT_ASSET_BUCKET = 'pilot-content-assets';
export const PILOT_RESOURCE_DOCUMENT_BUCKET = 'pilot-resource-documents';

export interface PilotContentSnapshot {
  slides: PilotCarouselSlide[];
  guideSteps: PilotGuideStep[];
  reviewCategories: PilotReviewCategoryOption[];
  quickCards: PilotReviewQuickCard[];
  safetyDocuments: PilotSafetyDocument[];
}

type QueryResponse<T> = { data: T | null; error: unknown };
interface QueryBuilder<T> extends PromiseLike<QueryResponse<T>> {
  select(columns?: string): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T>;
  insert(values: unknown): QueryBuilder<T>;
  update(values: unknown): QueryBuilder<T>;
  delete(): QueryBuilder<T>;
  eq(column: string, value: unknown): QueryBuilder<T>;
  single(): PromiseLike<QueryResponse<T>>;
}
interface Phase5AdminClient { from<T>(table: string): QueryBuilder<T>; }
const client = supabase as unknown as Phase5AdminClient;

const fail = (message: string, error?: unknown): never => {
  if (error) console.error(message, error);
  throw error instanceof Error ? error : new Error(message);
};

async function ordered<T>(table: string, column = 'display_order'): Promise<T[]> {
  const { data, error } = await client.from<T[]>(table).select('*').order(column, { ascending: true });
  if (error) fail(`Unable to load ${table}.`, error);
  return data ?? [];
}

export async function loadPilotContentSnapshot(): Promise<PilotContentSnapshot> {
  const [slides, guideSteps, reviewCategories, quickCards, safetyDocuments] = await Promise.all([
    ordered<PilotCarouselSlide>('pilot_carousel_slides'),
    ordered<PilotGuideStep>('pilot_guide_steps'),
    ordered<PilotReviewCategoryOption>('pilot_review_categories'),
    ordered<PilotReviewQuickCard>('pilot_review_quick_cards'),
    ordered<PilotSafetyDocument>('pilot_resource_documents', 'publication_date'),
  ]);
  return { slides, guideSteps, reviewCategories, quickCards, safetyDocuments };
}

async function saveRow<T extends { id?: string }>(table: string, row: T, key = 'id'): Promise<T> {
  const record = { ...row } as Record<string, unknown>;
  const identity = key === 'id' ? row.id : record[key];
  if (identity) {
    const { data, error } = await client.from<T>(table).update(record).eq(key, identity).select('*').single();
    if (error || !data) fail(`Unable to update ${table}.`, error);
    return data;
  }
  delete record.id;
  const { data, error } = await client.from<T>(table).insert(record).select('*').single();
  if (error || !data) fail(`Unable to create ${table}.`, error);
  return data;
}

async function removeRow(table: string, key: string, value: string): Promise<void> {
  const { error } = await client.from<never>(table).delete().eq(key, value);
  if (error) fail(`Unable to remove ${table} record.`, error);
}

export const savePilotCarouselSlide = (slide: PilotCarouselSlide) => saveRow('pilot_carousel_slides', slide);
export const deletePilotCarouselSlide = (id: string) => removeRow('pilot_carousel_slides', 'id', id);
export const savePilotGuideStep = (step: PilotGuideStep) => saveRow('pilot_guide_steps', step);
export const deletePilotGuideStep = (id: string) => removeRow('pilot_guide_steps', 'id', id);
export const savePilotReviewQuickCard = (card: PilotReviewQuickCard) => saveRow('pilot_review_quick_cards', card);
export const deletePilotReviewQuickCard = (id: string) => removeRow('pilot_review_quick_cards', 'id', id);
export const savePilotSafetyDocument = (document: PilotSafetyDocument) => saveRow('pilot_resource_documents', document);
export const deletePilotSafetyDocument = (id: string) => removeRow('pilot_resource_documents', 'id', id);
export const savePilotReviewCategory = (category: PilotReviewCategoryOption) => saveRow('pilot_review_categories', category as PilotReviewCategoryOption & { id?: string }, 'key');
export const deletePilotReviewCategory = (key: string) => removeRow('pilot_review_categories', 'key', key);

export function validatePilotContentImage(file: File): void {
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) fail('Carousel images must be smaller than 5 MB.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) fail('Carousel images must be JPG, PNG or WebP.');
}

export async function uploadPilotContentImage(file: File): Promise<string> {
  validatePilotContentImage(file);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `carousel/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(PILOT_CONTENT_ASSET_BUCKET).upload(path, file, {
    cacheControl: '31536000', contentType: file.type, upsert: false,
  });
  if (error) fail('Unable to upload the carousel image.', error);
  const { data } = supabase.storage.from(PILOT_CONTENT_ASSET_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) fail('Unable to resolve the carousel image URL.');
  return data.publicUrl;
}

export function validatePilotSafetyPdf(file: File): void {
  if (file.size <= 0 || file.size > 15 * 1024 * 1024) fail('Safety PDF files must be smaller than 15 MB.');
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) fail('Only PDF Safety Guide files are allowed.');
}

export async function uploadPilotSafetyPdf(file: File, version: string): Promise<{ storagePath: string; fileName: string; fileSize: number }> {
  validatePilotSafetyPdf(file);
  const safeVersion = version.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `safety-guide/${safeVersion}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(PILOT_RESOURCE_DOCUMENT_BUCKET).upload(storagePath, file, {
    cacheControl: '3600', contentType: 'application/pdf', upsert: false,
  });
  if (error) fail('Unable to upload the Safety Guide PDF.', error);
  return { storagePath, fileName: safeName, fileSize: file.size };
}

export function subscribeToPilotAdminContent(onChange: () => void): () => void {
  const channel = supabase
    .channel('pilot-admin-content')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pilot_carousel_slides' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pilot_guide_steps' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pilot_review_categories' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pilot_review_quick_cards' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pilot_resource_documents' }, onChange)
    .subscribe();
  return () => void supabase.removeChannel(channel);
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>): void {
  if (!rows.length) return;
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const ALL_PILOT_CAMPUSES: CampusLocation[] = [
  'pretoria_west_main', 'soshanguve_north', 'soshanguve_south', 'garankuwa', 'arcadia',
  'arts', 'mbombela', 'emalahleni', 'polokwane', 'giyani',
];
