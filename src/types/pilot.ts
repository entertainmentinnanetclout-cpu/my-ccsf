import type { Database, Json } from '@/integrations/supabase/types';

export type PilotSimulatedSeverity = 'low' | 'medium' | 'high' | 'critical';
export type PilotRoutingDestination = 'campus_security';

export type PilotProgram = Database['public']['Tables']['pilot_programs']['Row'];
export type PilotScenario = Database['public']['Tables']['pilot_scenarios']['Row'] & {
  simulated_severity: PilotSimulatedSeverity;
  routing_destination: PilotRoutingDestination;
  simulation_notice: string;
};
export type PilotParticipant = Database['public']['Tables']['pilot_participants']['Row'];
export type PilotSession = Database['public']['Tables']['pilot_sessions']['Row'];
export type PilotReport = Database['public']['Tables']['pilot_reports']['Row'] & {
  simulated_severity: PilotSimulatedSeverity;
  routing_destination: PilotRoutingDestination;
  routing_campus: CampusLocation;
  simulation_notice: string;
};
export type PilotReportEvent = Database['public']['Tables']['pilot_report_events']['Row'];
export type PilotLocationEvent = Database['public']['Tables']['pilot_location_events']['Row'];
export type PilotAttachment = Database['public']['Tables']['pilot_attachments']['Row'];
export type PilotNotification = Database['public']['Tables']['pilot_notifications']['Row'];
export type PilotFeatureTest = Database['public']['Tables']['pilot_feature_tests']['Row'];
export type PilotFeedback = Database['public']['Tables']['pilot_feedback']['Row'];
export type PilotAuditLog = Database['public']['Tables']['pilot_audit_logs']['Row'];
export type CampusLocation = Database['public']['Enums']['campus_location'];
export type IncidentCategory = Database['public']['Enums']['incident_category'];
export type PilotReportStatus = Database['public']['Enums']['pilot_report_status'];
export type PilotScenarioType = Database['public']['Enums']['pilot_scenario_type'];
export type PilotTestOutcome = Database['public']['Enums']['pilot_test_outcome'];

export interface PilotDeviceInfo {
  device_type: string | null;
  browser_name: string | null;
  browser_version: string | null;
  operating_system: string | null;
  viewport_width: number | null;
  viewport_height: number | null;
  network_type: string | null;
}

export interface PilotReportInput {
  program_id: string;
  session_id: string;
  participant_id: string;
  scenario_id?: string | null;
  campus: CampusLocation;
  title: string;
  description: string;
  category: IncidentCategory;
  is_anonymous?: boolean;
  emergency_consent?: boolean;
  location_lat?: number | null;
  location_lng?: number | null;
  location_accuracy?: number | null;
  location_description?: string | null;
}

export interface PilotFeedbackInput {
  program_id: string;
  session_id: string;
  report_id?: string | null;
  ease_of_use_rating?: number | null;
  confidence_rating?: number | null;
  clarity_rating?: number | null;
  would_use_in_emergency?: boolean | null;
  comments?: string | null;
}

export interface PilotDeletionPlan {
  status: 'deleted' | 'storage_cleanup_required' | 'ready_for_finalisation' | 'ready';
  operation: 'report' | 'session' | 'campus' | 'program' | 'expired';
  entity_id?: string;
  program_id?: string;
  campus?: CampusLocation;
  reason?: string;
  storage_paths?: string[];
  session_ids?: string[];
  participants?: number;
  sessions?: number;
  reports?: number;
  reports_deleted?: number;
  [key: string]: Json | undefined;
}

export interface PilotDashboardMetrics {
  invitedParticipants: number;
  consentedParticipants: number;
  activeSessions: number;
  completedSessions: number;
  totalReports: number;
  completedReports: number;
  completionRate: number;
  abandonmentRate: number;
  locationSuccessRate: number;
  attachmentSuccessRate: number;
  notificationReadRate: number;
  averageEaseRating: number;
  averageConfidenceRating: number;
  averageClarityRating: number;
}

export interface PilotAdminData {
  programs: PilotProgram[];
  scenarios: PilotScenario[];
  participants: PilotParticipant[];
  sessions: PilotSession[];
  reports: PilotReport[];
  events: PilotReportEvent[];
  featureTests: PilotFeatureTest[];
  feedback: PilotFeedback[];
  notifications: PilotNotification[];
  auditLogs: PilotAuditLog[];
}