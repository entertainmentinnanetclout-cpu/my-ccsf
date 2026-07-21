import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { CampusLocation } from '@/types/pilot';
import {
  DEFAULT_PILOT_REVIEW_CATEGORIES,
  DEFAULT_PILOT_REVIEW_QUICK_CARDS,
  type PilotReview,
  type PilotReviewCategoryOption,
  type PilotReviewInput,
  type PilotReviewOptions,
  type PilotReviewQuickCard,
  type PilotReviewStatus,
  type PilotStudentIdentity,
} from '@/types/pilotReviews';

export const PILOT_REVIEW_ATTACHMENT_BUCKET = 'pilot-review-attachments';
export const PILOT_REVIEW_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const PILOT_REVIEW_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const reviewTable = () => supabase.from('pilot_reviews' as keyof Database['public']['Tables']);

type DataResponse<T> = { data: T | null; error: unknown };
interface QueryBuilder<T> extends PromiseLike<DataResponse<T>> {
  select(columns?: string): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T>;
}
interface Phase5ReviewClient {
  from<T>(table: string): QueryBuilder<T>;
}
const phase5ReviewClient = supabase as unknown as Phase5ReviewClient;

const fail = (message: string, error?: unknown): never => {
  if (error) console.error(message, error);
  throw error instanceof Error ? error : new Error(message);
};

export async function loadPilotReviews(): Promise<PilotReview[]> {
  const { data, error } = await reviewTable().select('*').order('created_at', { ascending: false });
  if (error) fail('Unable to load Pilot reviews.', error);
  return (data ?? []) as unknown as PilotReview[];
}

export async function loadPilotReviewOptions(): Promise<PilotReviewOptions> {
  const [categoryResponse, cardResponse] = await Promise.all([
    phase5ReviewClient.from<PilotReviewCategoryOption[]>('pilot_review_categories').select('*').order('display_order', { ascending: true }),
    phase5ReviewClient.from<PilotReviewQuickCard[]>('pilot_review_quick_cards').select('*').order('display_order', { ascending: true }),
  ]);

  if (categoryResponse.error || cardResponse.error) {
    console.error('Unable to load managed Pilot review options. Using controlled defaults.', categoryResponse.error ?? cardResponse.error);
    return { categories: DEFAULT_PILOT_REVIEW_CATEGORIES, quickCards: DEFAULT_PILOT_REVIEW_QUICK_CARDS };
  }

  const categories = categoryResponse.data?.filter((item) => item.is_active) ?? [];
  const quickCards = cardResponse.data?.filter((item) => item.is_active) ?? [];
  return {
    categories: categories.length ? categories : DEFAULT_PILOT_REVIEW_CATEGORIES,
    quickCards: quickCards.length ? quickCards : DEFAULT_PILOT_REVIEW_QUICK_CARDS,
  };
}

export async function loadPilotStudentIdentities(userIds: string[]): Promise<Record<string, PilotStudentIdentity>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) return {};
  const { data, error } = await supabase.rpc('pilot_get_student_identities' as never, { p_user_ids: uniqueIds } as never);
  if (error) fail('Unable to load authorised Pilot student details.', error);
  return Object.fromEntries(((data ?? []) as unknown as PilotStudentIdentity[]).map((identity) => [identity.id, identity]));
}

export async function submitPilotReview(input: PilotReviewInput): Promise<PilotReview> {
  const { data, error } = await supabase.rpc('pilot_submit_review' as never, {
    p_rating: input.rating,
    p_category: input.category,
    p_quick_feedback: input.quickFeedback,
    p_review_text: input.reviewText,
    p_report_id: input.reportId ?? null,
    p_attachment_path: input.attachmentPath ?? null,
    p_device_metadata: input.deviceMetadata,
    p_contact_permission: input.contactPermission,
    p_review_id: input.reviewId ?? null,
  } as never);
  if (error || !data) fail('Unable to submit the Pilot review.', error);
  return data as unknown as PilotReview;
}

export async function moderatePilotReview(
  reviewId: string,
  status: Exclude<PilotReviewStatus, 'submitted'>,
  adminResponse?: string | null,
): Promise<PilotReview> {
  const { data, error } = await supabase.rpc('pilot_moderate_review' as never, {
    p_review_id: reviewId,
    p_status: status,
    p_admin_response: adminResponse ?? null,
  } as never);
  if (error || !data) fail('Unable to update the Pilot review.', error);
  return data as unknown as PilotReview;
}

export function validatePilotReviewAttachment(file: File): void {
  if (file.size <= 0 || file.size > PILOT_REVIEW_MAX_FILE_BYTES) fail('The screenshot must be smaller than 5 MB.');
  if (!PILOT_REVIEW_ALLOWED_MIME_TYPES.includes(file.type as (typeof PILOT_REVIEW_ALLOWED_MIME_TYPES)[number])) {
    fail('Only JPG, PNG and WebP screenshots are allowed.');
  }
}

export async function uploadPilotReviewAttachment(input: { file: File; programId: string; campus: CampusLocation; userId: string }): Promise<string> {
  validatePilotReviewAttachment(input.file);
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${input.programId}/${input.campus}/${input.userId}/reviews/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(PILOT_REVIEW_ATTACHMENT_BUCKET).upload(path, input.file, {
    cacheControl: '3600', contentType: input.file.type, upsert: false,
  });
  if (error) fail('Unable to upload the review screenshot.', error);
  return path;
}

export async function createPilotReviewAttachmentSignedUrl(path: string, expiresIn = 300): Promise<string> {
  const { data, error } = await supabase.storage.from(PILOT_REVIEW_ATTACHMENT_BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) fail('Unable to open the private review screenshot.', error);
  return data.signedUrl;
}

export function subscribeToPilotReviews(onChange: () => void): () => void {
  const channel = supabase
    .channel('pilot-reviews')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pilot_reviews' }, onChange)
    .subscribe();
  return () => void supabase.removeChannel(channel);
}
