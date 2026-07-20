import type { CampusLocation, PilotDeviceInfo } from '@/types/pilot';

export type PilotReviewStatus = 'submitted' | 'under_review' | 'responded' | 'resolved' | 'hidden' | 'flagged';

export type PilotReviewCategory =
  | 'usability'
  | 'location'
  | 'reporting'
  | 'case_updates'
  | 'navigation'
  | 'performance'
  | 'broken_feature'
  | 'other';

export interface PilotReview {
  id: string;
  program_id: string;
  participant_id: string;
  user_id: string;
  campus: CampusLocation;
  report_id: string | null;
  rating: number;
  category: PilotReviewCategory;
  quick_feedback: string[];
  review_text: string;
  attachment_path: string | null;
  device_metadata: PilotDeviceInfo & Record<string, unknown>;
  contact_permission: boolean;
  status: PilotReviewStatus;
  admin_response: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PilotReviewInput {
  rating: number;
  category: PilotReviewCategory;
  quickFeedback: string[];
  reviewText: string;
  reportId?: string | null;
  attachmentPath?: string | null;
  deviceMetadata: PilotDeviceInfo;
  contactPermission: boolean;
  reviewId?: string | null;
}

export const PILOT_REVIEW_STATUS_LABELS: Record<PilotReviewStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  responded: 'Responded',
  resolved: 'Resolved',
  hidden: 'Hidden',
  flagged: 'Flagged',
};

export const PILOT_REVIEW_CATEGORY_LABELS: Record<PilotReviewCategory, string> = {
  usability: 'Ease of use',
  location: 'Location',
  reporting: 'Reporting',
  case_updates: 'Case updates',
  navigation: 'Navigation',
  performance: 'Performance',
  broken_feature: 'Broken feature',
  other: 'Other',
};

export const EDITABLE_PILOT_REVIEW_STATUSES = new Set<PilotReviewStatus>([
  'submitted',
  'under_review',
  'responded',
]);
