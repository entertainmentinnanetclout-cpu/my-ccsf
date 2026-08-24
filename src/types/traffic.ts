import type { Database, Tables } from '@/integrations/supabase/types';

export type TrafficCampus = Database['public']['Enums']['campus_location'];
export type TrafficPassStatus = Database['public']['Enums']['traffic_pass_status'];
export type TrafficStudentPermitStatus = Database['public']['Enums']['traffic_student_permit_status'];
export type TrafficPermitKind = Database['public']['Enums']['traffic_permit_kind'];
export type TrafficTemplateStatus = Database['public']['Enums']['traffic_template_status'];

export type TrafficVisitorPass = Omit<
  Tables<'traffic_visitor_passes'>,
  'tracking_token_hash' | 'contact_fingerprint'
>;
export type TrafficStudentPermit = Tables<'traffic_student_permits'>;
export type TrafficPermitTemplate = Tables<'traffic_permit_templates'>;
export type TrafficRoadSafetyNotice = Tables<'traffic_road_safety_notices'>;

export interface VisitorParkingRequest {
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleColour: string;
  campus: TrafficCampus;
  hostName: string;
  hostDepartment: string;
  visitPurpose: string;
  visitDate: string;
  expectedArrival: string;
}

export interface VisitorPassReceipt {
  passId: string;
  referenceCode: string;
  trackingToken: string;
  passStatus: TrafficPassStatus;
  submittedAt: string;
}

export interface VisitorPassTracking {
  passId: string;
  referenceCode: string;
  visitorName: string;
  vehicleRegistration: string;
  campus: TrafficCampus;
  visitDate: string;
  expectedArrival: string;
  passStatus: TrafficPassStatus;
  decisionNotes: string | null;
  approvedAt: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  submittedAt: string;
}

export const TRAFFIC_TEMPLATE_BUCKET = 'traffic-permit-templates';
export const TRAFFIC_MAX_TEMPLATE_BYTES = 10 * 1024 * 1024;
export const TRAFFIC_TEMPLATE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const TRAFFIC_PASS_STATUS_LABELS: Record<TrafficPassStatus, string> = {
  pending: 'Awaiting review',
  approved: 'Approved for gate review',
  rejected: 'Not approved',
  checked_in: 'Checked in',
  checked_out: 'Checked out',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export const TRAFFIC_STUDENT_STATUS_LABELS: Record<TrafficStudentPermitStatus, string> = {
  pending: 'Awaiting Traffic review',
  active: 'Active',
  suspended: 'Suspended',
  expired: 'Expired',
  rejected: 'Not approved',
};

export const DEFAULT_TRAFFIC_NOTICES: Array<
  Pick<TrafficRoadSafetyNotice, 'id' | 'title' | 'summary' | 'severity' | 'campus'>
> = [
  {
    id: 'student-zones',
    title: 'Students park only in student zones',
    summary: 'Use marked student bays only. Visitor, staff, accessible and emergency bays remain restricted.',
    severity: 'information',
    campus: null,
  },
  {
    id: 'pedestrian-priority',
    title: 'Pedestrians have priority',
    summary: 'Drive slowly near crossings, residences, lecture venues and queues at campus gates.',
    severity: 'caution',
    campus: null,
  },
  {
    id: 'approval-required',
    title: 'A request is not automatic gate access',
    summary: 'Visitors must wait for approval and present their reference with identification at the gate.',
    severity: 'information',
    campus: null,
  },
];
