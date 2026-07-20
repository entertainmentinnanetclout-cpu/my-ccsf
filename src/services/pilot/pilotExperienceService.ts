import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { CampusLocation } from '@/types/pilot';
import type {
  PilotCarouselSlide,
  PilotGuidePreferences,
  PilotGuidePreferenceUpdate,
  PilotSafetyDocument,
} from '@/types/pilotExperience';

export const PILOT_GUIDE_VERSION = '2026.07';
export const PILOT_SAFETY_GUIDE_FALLBACK: PilotSafetyDocument = {
  id: 'phase4-static-safety-guide',
  program_id: null,
  title: 'CCSF Pilot Safety Guide',
  description: 'Print-ready A4 handbook covering reporting, location permissions, case tracking, privacy, safety actions and verified support channels.',
  document_type: 'safety_guide',
  version: '1.0',
  publication_date: '2026-07-20',
  download_url: '/downloads/CCSF-Pilot-Safety-Guide-v1.0.pdf',
  campus_targets: [],
  is_active: true,
  starts_at: null,
  expires_at: null,
  created_at: '2026-07-20T00:00:00.000Z',
  updated_at: '2026-07-20T00:00:00.000Z',
};

const phase4Table = (table: 'pilot_carousel_slides' | 'pilot_resource_documents') =>
  supabase.from(table as keyof Database['public']['Tables']);

const fail = (message: string, error?: unknown): never => {
  if (error) console.error(message, error);
  throw error instanceof Error ? error : new Error(message);
};

export async function loadPilotCarouselSlides(programId: string): Promise<PilotCarouselSlide[]> {
  const { data, error } = await phase4Table('pilot_carousel_slides')
    .select('*')
    .or(`program_id.is.null,program_id.eq.${programId}`)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) fail('Unable to load the Pilot dashboard carousel.', error);
  return (data ?? []) as unknown as PilotCarouselSlide[];
}

export async function loadPilotSafetyDocument(programId: string): Promise<PilotSafetyDocument> {
  const { data, error } = await phase4Table('pilot_resource_documents')
    .select('*')
    .eq('document_type', 'safety_guide')
    .or(`program_id.is.null,program_id.eq.${programId}`)
    .order('publication_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Unable to load the versioned Pilot safety document. Using the approved static fallback.', error);
    return PILOT_SAFETY_GUIDE_FALLBACK;
  }
  return (data as unknown as PilotSafetyDocument | null) ?? PILOT_SAFETY_GUIDE_FALLBACK;
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

export function subscribeToPilotCarouselSlides(
  programId: string,
  campus: CampusLocation,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`pilot-carousel-${programId}-${campus}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pilot_carousel_slides' }, onChange)
    .subscribe();
  return () => void supabase.removeChannel(channel);
}
