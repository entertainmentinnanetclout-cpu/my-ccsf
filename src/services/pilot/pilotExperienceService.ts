import { supabase } from '@/integrations/supabase/client';
import type { CampusLocation } from '@/types/pilot';
import type {
  PilotCarouselSlide,
  PilotGuidePreferences,
  PilotGuidePreferenceUpdate,
  PilotGuideStep,
  PilotSafetyDocument,
} from '@/types/pilotExperience';

export const PILOT_GUIDE_VERSION = '2026.07.2';
export const PILOT_RESOURCE_BUCKET = 'pilot-resource-documents';

export const DEFAULT_PILOT_GUIDE_STEPS: PilotGuideStep[] = [
  ['dashboard_navigation', 'Navigate the Pilot dashboard', 'Use Home for both the Pilot information carousel and campus/residence image carousel, My Cases for progress, Report for test submissions, Reviews for feedback, Documents for public guides and Support for staff notifications.', 'Dashboard', 'home'],
  ['mode_switching', 'Move between Official and Pilot', 'Use Open Pilot in the official student header and Official Student Portal in Pilot Mode. The two environments share your account but keep Pilot cases isolated from official incidents.', 'Mode switching', 'shield'],
  ['academic_fraud', 'Report academic fraud with evidence', 'Choose Academic Fraud & Fake Admin Services for paid mark changes, courses, sick letters, WIL placements, academic records or impersonated admin services. Add factual details and attach screenshots, PDFs or payment evidence.', 'Academic fraud', 'report'],
  ['standard_reporting', 'Submit a standard report', 'Select an authorised scenario, describe the test incident, confirm a readable location when required and attach only relevant evidence.', 'Standard reporting', 'report'],
  ['emergency_reporting', 'Use Emergency Test correctly', 'Emergency Test is deliberately short. Share your current location, read the consent statement and submit. Your registered student profile is attached automatically.', 'Emergency reporting', 'emergency'],
  ['case_tracking', 'Track a case from start to finish', 'Open any case card to see the reference number, current status, assigned staff member, timeline notes, evidence and authorised campus-security updates.', 'Case tracking', 'cases'],
  ['public_documents', 'Use the public document library', 'Download the branded campus handbook, Building Structure and Student Services Guide, and My CCSF Pilot App User Guide. Internal CCSF operating documents are not published to students.', 'Documents', 'home'],
  ['pilot_limitations', 'Know the Pilot limitations', 'The Pilot tests digital workflows only. It does not replace Campus Protection Services authority, SAPS, ambulance services or established emergency procedures.', 'Important limitation', 'limitations'],
].map(([stepKey, title, description, accent, iconKey], index) => ({
  id: `default-guide-${index + 1}`,
  step_key: stepKey,
  title,
  description,
  accent,
  icon_key: iconKey as PilotGuideStep['icon_key'],
  display_order: index,
  is_active: true,
  created_by: null,
  updated_by: null,
  created_at: '2026-07-22T00:00:00.000Z',
  updated_at: '2026-07-22T00:00:00.000Z',
}));

export const PILOT_RESOURCE_DOCUMENT_FALLBACKS: PilotSafetyDocument[] = [
  {
    id: '40000000-0000-4000-8000-000000000101',
    program_id: null,
    title: 'TUT Pretoria Campus Safety, Security & Navigation Handbook',
    description: 'A premium CCSF and TUT branded public handbook covering Buildings 1-60, student-service routes, academic-scam reporting, evidence protection, safety guidance and emergency support.',
    document_type: 'safety_guide',
    version: '2.2',
    publication_date: '2026-07-22',
    download_url: '/downloads/My-CCSF-TUT-Pretoria-Campus-Safety-Security-Navigation-Handbook-v2.2.pdf',
    storage_path: null,
    file_name: 'My-CCSF-TUT-Pretoria-Campus-Safety-Security-Navigation-Handbook-v2.2.pdf',
    file_size_bytes: null,
    campus_targets: [],
    is_active: true,
    starts_at: null,
    expires_at: null,
    created_at: '2026-07-22T00:00:00.000Z',
    updated_at: '2026-07-22T00:00:00.000Z',
  },
  {
    id: '40000000-0000-4000-8000-000000000102',
    program_id: null,
    title: 'TUT Pretoria Campus Building Structure & Student Services Guide',
    description: 'A public building-number directory and student-service routing guide showing verified locations, confirmation status and where students should go for common campus needs.',
    document_type: 'quick_reference',
    version: '1.0',
    publication_date: '2026-07-22',
    download_url: '/downloads/My-CCSF-TUT-Pretoria-Campus-Building-Structure-Student-Services-Guide-v1.0.pdf',
    storage_path: null,
    file_name: 'My-CCSF-TUT-Pretoria-Campus-Building-Structure-Student-Services-Guide-v1.0.pdf',
    file_size_bytes: null,
    campus_targets: [],
    is_active: true,
    starts_at: null,
    expires_at: null,
    created_at: '2026-07-22T00:00:00.000Z',
    updated_at: '2026-07-22T00:00:00.000Z',
  },
  {
    id: '40000000-0000-4000-8000-000000000103',
    program_id: null,
    title: 'My CCSF Pilot App User Guide',
    description: 'A student-facing guide to Official and Pilot navigation, campus and residence carousels, academic-fraud reporting, private evidence, case tracking, documents, reviews and emergency limitations.',
    document_type: 'other',
    version: '1.0',
    publication_date: '2026-07-22',
    download_url: '/downloads/My-CCSF-Pilot-App-User-Guide-v1.0.pdf',
    storage_path: null,
    file_name: 'My-CCSF-Pilot-App-User-Guide-v1.0.pdf',
    file_size_bytes: null,
    campus_targets: [],
    is_active: true,
    starts_at: null,
    expires_at: null,
    created_at: '2026-07-22T00:00:00.000Z',
    updated_at: '2026-07-22T00:00:00.000Z',
  },
];

export const PILOT_SAFETY_GUIDE_FALLBACK = PILOT_RESOURCE_DOCUMENT_FALLBACKS[0];

const CONFIDENTIAL_RESOURCE_PATTERN = /operating[- ]structure|activation plan|six[- ]person|functional allocation|estimated (?:implementation )?finances|financial framework|governance|internal case[- ]handling/i;
const CONFIDENTIAL_FILE_PATTERN = /CCSF-Crime-Prevention-Unit-Operating-Structure-Pilot-Activation-Plan/i;

export function isPublicPilotResource(document: PilotSafetyDocument) {
  const searchable = `${document.title} ${document.description} ${document.download_url} ${document.file_name ?? ''}`;
  return document.is_active
    && !CONFIDENTIAL_RESOURCE_PATTERN.test(searchable)
    && !CONFIDENTIAL_FILE_PATTERN.test(searchable);
}

type QueryResponse<T> = { data: T | null; error: unknown };
interface QueryBuilder<T> extends PromiseLike<QueryResponse<T>> {
  select(columns?: string): QueryBuilder<T>;
  or(filters: string): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T>;
  eq(column: string, value: unknown): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  maybeSingle(): PromiseLike<QueryResponse<T>>;
}
interface PilotExperienceClient { from<T>(table: string): QueryBuilder<T>; }
const pilotExperienceClient = supabase as unknown as PilotExperienceClient;

const fail = (message: string, error?: unknown): never => {
  if (error) console.error(message, error);
  throw error instanceof Error ? error : new Error(message);
};

export async function loadPilotCarouselSlides(programId: string): Promise<PilotCarouselSlide[]> {
  const { data, error } = await pilotExperienceClient
    .from<PilotCarouselSlide[]>('pilot_carousel_slides')
    .select('*')
    .or(`program_id.is.null,program_id.eq.${programId}`)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) fail('Unable to load the Pilot dashboard carousel.', error);
  return (data ?? []).filter((slide) => slide.is_active);
}

export async function loadPilotGuideSteps(): Promise<PilotGuideStep[]> {
  const { data, error } = await pilotExperienceClient
    .from<PilotGuideStep[]>('pilot_guide_steps')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) {
    console.error('Unable to load managed Pilot guide content. Using controlled defaults.', error);
    return DEFAULT_PILOT_GUIDE_STEPS;
  }
  const active = (data ?? []).filter((step) => step.is_active).slice(0, 8);
  return active.length ? active : DEFAULT_PILOT_GUIDE_STEPS;
}

export async function resolvePilotSafetyDocumentUrl(document: PilotSafetyDocument, expiresIn = 600): Promise<string> {
  if (!document.storage_path) return document.download_url;
  const { data, error } = await supabase.storage.from(PILOT_RESOURCE_BUCKET).createSignedUrl(document.storage_path, expiresIn);
  if (error || !data?.signedUrl) fail('Unable to create a secure resource download link.', error);
  return data.signedUrl;
}

const resourceKey = (document: PilotSafetyDocument) => document.file_name ?? `${document.document_type}:${document.title}`;

export async function loadPilotResourceDocuments(programId: string): Promise<PilotSafetyDocument[]> {
  const publicFallbacks = PILOT_RESOURCE_DOCUMENT_FALLBACKS.filter(isPublicPilotResource);
  const fallbackByKey = new Map(publicFallbacks.map((document) => [resourceKey(document), document]));
  const { data, error } = await pilotExperienceClient
    .from<PilotSafetyDocument[]>('pilot_resource_documents')
    .select('*')
    .or(`program_id.is.null,program_id.eq.${programId}`)
    .order('publication_date', { ascending: false });

  if (error) {
    console.error('Unable to load managed Pilot documents. Using the approved public release library.', error);
    return publicFallbacks;
  }

  const resolved = await Promise.all((data ?? []).filter(isPublicPilotResource).map(async (document) => {
    try {
      return { ...document, download_url: await resolvePilotSafetyDocumentUrl(document) };
    } catch (signedUrlError) {
      console.error(`Managed document link could not be signed for ${document.title}.`, signedUrlError);
      return document;
    }
  }));

  for (const document of resolved) fallbackByKey.set(resourceKey(document), document);

  return [...fallbackByKey.values()]
    .filter(isPublicPilotResource)
    .sort((a, b) => Date.parse(b.publication_date) - Date.parse(a.publication_date));
}

export async function loadPilotSafetyDocument(programId: string): Promise<PilotSafetyDocument> {
  const documents = await loadPilotResourceDocuments(programId);
  return documents.find((document) => document.document_type === 'safety_guide') ?? PILOT_SAFETY_GUIDE_FALLBACK;
}

export async function loadPilotGuidePreferences(): Promise<PilotGuidePreferences> {
  const { data, error } = await supabase.rpc('pilot_get_guide_preferences' as never);
  if (error || !data) fail('Unable to load the Pilot guide preference.', error);
  return data as unknown as PilotGuidePreferences;
}

export async function updatePilotGuidePreferences(input: PilotGuidePreferenceUpdate): Promise<PilotGuidePreferences> {
  const { data, error } = await supabase.rpc('pilot_update_guide_preferences' as never, {
    p_last_step: input.lastStep ?? null,
    p_auto_show: input.autoShow ?? null,
    p_completed: input.completed ?? false,
    p_dismissed: input.dismissed ?? false,
    p_reset: input.reset ?? false,
  } as never);
  if (error || !data) fail('Unable to save the Pilot guide preference.', error);
  return data as unknown as PilotGuidePreferences;
}

export function subscribeToPilotCarouselSlides(programId: string, campus: CampusLocation, onChange: () => void): () => void {
  const channel = supabase
    .channel(`pilot-carousel-${programId}-${campus}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pilot_carousel_slides' }, onChange)
    .subscribe();
  return () => void supabase.removeChannel(channel);
}

export function subscribeToPilotExperienceConfiguration(onChange: () => void): () => void {
  const channel = supabase
    .channel('pilot-experience-configuration')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pilot_guide_steps' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pilot_resource_documents' }, onChange)
    .subscribe();
  return () => void supabase.removeChannel(channel);
}
