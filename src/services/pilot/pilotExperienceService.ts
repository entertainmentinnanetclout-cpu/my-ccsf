import { supabase } from '@/integrations/supabase/client';
import type { CampusLocation } from '@/types/pilot';
import type {
  PilotCarouselSlide,
  PilotGuidePreferences,
  PilotGuidePreferenceUpdate,
  PilotGuideStep,
  PilotSafetyDocument,
} from '@/types/pilotExperience';

export const PILOT_GUIDE_VERSION = '2026.07';
export const PILOT_RESOURCE_BUCKET = 'pilot-resource-documents';

export const DEFAULT_PILOT_GUIDE_STEPS: PilotGuideStep[] = [
  ['dashboard_navigation', 'Navigate the Pilot dashboard', 'Use Home for the carousel and quick actions, My Cases for progress, Report for test submissions, Reviews for feedback, Safety Guide for learning material and Support for staff notifications.', 'Dashboard', 'home'],
  ['standard_reporting', 'Submit a standard report', 'Select an authorised scenario, describe the test incident, confirm the readable location and attach only relevant test evidence when requested.', 'Standard reporting', 'report'],
  ['emergency_reporting', 'Use Emergency Test correctly', 'Emergency Test is deliberately short. Share your current location, read the consent statement and submit. Your registered student profile is attached automatically.', 'Emergency reporting', 'emergency'],
  ['location_permissions', 'Understand location permissions', 'The app requests a high-accuracy position first, shows a readable address and stores coordinates and accuracy as supporting technical evidence inside the isolated Pilot.', 'Location', 'location'],
  ['case_tracking', 'Track a case from start to finish', 'Open any case card to see the reference number, current status, assigned staff member, timeline notes, evidence and authorised campus-security updates.', 'Case tracking', 'cases'],
  ['staff_notifications', 'Read staff notifications', 'Authorised Pilot staff can send case-linked updates. Unread messages appear in Support and remain tied to your authenticated student account.', 'Notifications', 'notifications'],
  ['pilot_reviews', 'Submit a Pilot review', 'Choose quick feedback, add a 1-5 star rating and explain what worked or failed. You can edit unresolved reviews and read authorised responses.', 'Reviews', 'reviews'],
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
  created_at: '2026-07-21T00:00:00.000Z',
  updated_at: '2026-07-21T00:00:00.000Z',
}));

export const PILOT_RESOURCE_DOCUMENT_FALLBACKS: PilotSafetyDocument[] = [
  {
    id: '40000000-0000-4000-8000-000000000101',
    program_id: null,
    title: 'TUT Pretoria Campus Safety, Security & Navigation Handbook',
    description: 'A comprehensive CCSF and TUT branded handbook covering Buildings 1-60, verified departments and student-service routes, online-scam reporting, safety guidance and emergency support.',
    document_type: 'safety_guide',
    version: '2.1',
    publication_date: '2026-07-22',
    download_url: '/downloads/My-CCSF-TUT-Pretoria-Campus-Safety-Security-Navigation-Handbook-v2.1.pdf',
    storage_path: null,
    file_name: 'My-CCSF-TUT-Pretoria-Campus-Safety-Security-Navigation-Handbook-v2.1.pdf',
    file_size_bytes: 76_667,
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
    title: 'CCSF Crime Prevention Unit Operating Structure & Pilot Activation Plan',
    description: 'The updated corporate operating structure, CPS reporting line, six-person functional model, case-handling workflow, online-scam prevention campaign, campus activation plan and estimated implementation finances.',
    document_type: 'other',
    version: '1.1',
    publication_date: '2026-07-22',
    download_url: '/downloads/CCSF-Crime-Prevention-Unit-Operating-Structure-Pilot-Activation-Plan-v1.1.pptx',
    storage_path: null,
    file_name: 'CCSF-Crime-Prevention-Unit-Operating-Structure-Pilot-Activation-Plan-v1.1.pptx',
    file_size_bytes: 43_777,
    campus_targets: [],
    is_active: true,
    starts_at: null,
    expires_at: null,
    created_at: '2026-07-22T00:00:00.000Z',
    updated_at: '2026-07-22T00:00:00.000Z',
  },
];

export const PILOT_SAFETY_GUIDE_FALLBACK = PILOT_RESOURCE_DOCUMENT_FALLBACKS[0];

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
  return data ?? [];
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

const newerDocument = (current: PilotSafetyDocument, candidate: PilotSafetyDocument) => {
  const currentDate = Date.parse(current.publication_date);
  const candidateDate = Date.parse(candidate.publication_date);
  return candidateDate >= currentDate ? candidate : current;
};

export async function loadPilotResourceDocuments(programId: string): Promise<PilotSafetyDocument[]> {
  const fallbackById = new Map(PILOT_RESOURCE_DOCUMENT_FALLBACKS.map((document) => [document.id, document]));
  const { data, error } = await pilotExperienceClient
    .from<PilotSafetyDocument[]>('pilot_resource_documents')
    .select('*')
    .or(`program_id.is.null,program_id.eq.${programId}`)
    .order('publication_date', { ascending: false });

  if (error) {
    console.error('Unable to load managed Pilot documents. Using the approved release library.', error);
    return PILOT_RESOURCE_DOCUMENT_FALLBACKS;
  }

  const resolved = await Promise.all((data ?? []).map(async (document) => {
    try {
      return { ...document, download_url: await resolvePilotSafetyDocumentUrl(document) };
    } catch (signedUrlError) {
      console.error(`Managed document link could not be signed for ${document.title}.`, signedUrlError);
      return document;
    }
  }));

  for (const document of resolved) {
    const existing = fallbackById.get(document.id);
    fallbackById.set(document.id, existing ? newerDocument(existing, document) : document);
  }

  return [...fallbackById.values()]
    .filter((document) => document.is_active)
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
