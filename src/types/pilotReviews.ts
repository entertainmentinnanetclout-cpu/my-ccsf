import type { CampusLocation, PilotDeviceInfo } from '@/types/pilot';

export type PilotReviewStatus = 'submitted' | 'under_review' | 'responded' | 'resolved' | 'hidden' | 'flagged';
export type PilotReviewCategory = string;
export type PilotReviewSentiment = 'positive' | 'negative' | 'neutral';

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

export interface PilotReviewCategoryOption {
  key: string;
  label: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PilotReviewQuickCard {
  id: string;
  label: string;
  category_key: string;
  sentiment: PilotReviewSentiment;
  display_order: number;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PilotReviewOptions {
  categories: PilotReviewCategoryOption[];
  quickCards: PilotReviewQuickCard[];
}

export interface PilotStudentIdentity {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  campus: CampusLocation | null;
  student_number: string | null;
  course: string | null;
  year_of_study: number | null;
  residence: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
}

export const PILOT_REVIEW_STATUS_LABELS: Record<PilotReviewStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  responded: 'Responded',
  resolved: 'Resolved',
  hidden: 'Hidden',
  flagged: 'Flagged',
};

export const PILOT_REVIEW_CATEGORY_LABELS: Record<string, string> = {
  usability: 'Ease of use',
  location: 'Location',
  reporting: 'Reporting',
  case_updates: 'Case updates',
  navigation: 'Navigation',
  performance: 'Performance',
  broken_feature: 'Broken feature',
  other: 'Other',
};

export const DEFAULT_PILOT_REVIEW_CATEGORIES: PilotReviewCategoryOption[] = Object.entries(PILOT_REVIEW_CATEGORY_LABELS).map(([key, label], index) => ({
  key,
  label,
  description: '',
  display_order: (index + 1) * 10,
  is_active: true,
  created_by: null,
  updated_by: null,
  created_at: '2026-07-21T00:00:00.000Z',
  updated_at: '2026-07-21T00:00:00.000Z',
}));

export const DEFAULT_PILOT_REVIEW_QUICK_CARDS: PilotReviewQuickCard[] = [
  ['Easy to use', 'usability', 'positive'],
  ['Location worked correctly', 'location', 'positive'],
  ['Reporting was clear', 'reporting', 'positive'],
  ['Case updates were useful', 'case_updates', 'positive'],
  ['I felt more informed', 'case_updates', 'positive'],
  ['Navigation was confusing', 'navigation', 'negative'],
  ['Location was inaccurate', 'location', 'negative'],
  ['App was slow', 'performance', 'negative'],
  ['I found a broken feature', 'broken_feature', 'negative'],
  ['Other feedback', 'other', 'neutral'],
].map(([label, category, sentiment], index) => ({
  id: `default-${index + 1}`,
  label,
  category_key: category,
  sentiment: sentiment as PilotReviewSentiment,
  display_order: (index + 1) * 10,
  is_active: true,
  created_by: null,
  updated_by: null,
  created_at: '2026-07-21T00:00:00.000Z',
  updated_at: '2026-07-21T00:00:00.000Z',
}));

export const EDITABLE_PILOT_REVIEW_STATUSES = new Set<PilotReviewStatus>([
  'submitted',
  'under_review',
  'responded',
]);
