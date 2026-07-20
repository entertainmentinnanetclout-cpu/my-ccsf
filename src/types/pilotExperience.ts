import type { CampusLocation } from '@/types/pilot';

export type PilotCarouselAction = 'none' | 'report' | 'emergency' | 'cases' | 'reviews' | 'resources' | 'support';
export type PilotCarouselIcon = 'shield' | 'report' | 'emergency' | 'location' | 'cases' | 'reviews' | 'guide' | 'limitations';

export interface PilotCarouselSlide {
  id: string;
  program_id: string | null;
  title: string;
  description: string;
  eyebrow: string;
  icon_key: PilotCarouselIcon;
  image_url: string | null;
  image_alt: string | null;
  image_fit: 'contain' | 'cover';
  button_label: string | null;
  action_key: PilotCarouselAction;
  campus_targets: CampusLocation[];
  display_order: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PilotGuidePreferences {
  user_id: string;
  program_id: string;
  guide_version: string;
  guide_last_step: number;
  guide_auto_show: boolean;
  guide_completed_at: string | null;
  guide_dismissed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PilotSafetyDocument {
  id: string;
  program_id: string | null;
  title: string;
  description: string;
  document_type: 'safety_guide' | 'quick_reference' | 'other';
  version: string;
  publication_date: string;
  download_url: string;
  campus_targets: CampusLocation[];
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PilotGuidePreferenceUpdate {
  lastStep?: number | null;
  autoShow?: boolean | null;
  completed?: boolean;
  dismissed?: boolean;
  reset?: boolean;
}
