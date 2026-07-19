import { supabase } from '@/integrations/supabase/client';
import { invokePilotFunction } from '@/services/pilot/pilotEdgeService';
import type { Database, Json } from '@/integrations/supabase/types';
import type {
  CampusLocation,
  PilotAdminData,
  PilotAuditLog,
  PilotDashboardMetrics,
  PilotDeletionPlan,
  PilotNotification,
  PilotParticipant,
  PilotProgram,
  PilotReport,
  PilotReportEvent,
  PilotReportStatus,
  PilotScenario,
} from '@/types/pilot';

export interface PilotStudentProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  campus: CampusLocation | null;
  student_number: string | null;
}

const throwError = (message: string, error?: unknown): never => {
  if (error) console.error(message, error);
  throw error instanceof Error ? error : new Error(message);
};

export async function loadPilotAdminData(options?: {
  programId?: string | null;
  campus?: CampusLocation | null;
}): Promise<PilotAdminData> {
  const programId = options?.programId ?? null;
  const campus = options?.campus ?? null;
  const programsQuery = supabase.from('pilot_programs').select('*').order('created_at', { ascending: false });
  let scenariosQuery = supabase.from('pilot_scenarios').select('*').order('display_order', { ascending: true });
  let participantsQuery = supabase.from('pilot_participants').select('*').order('created_at', { ascending: false });
  let sessionsQuery = supabase.from('pilot_sessions').select('*').order('started_at', { ascending: false });
  let reportsQuery = supabase.from('pilot_reports').select('*').order('submitted_at', { ascending: false });
  let eventsQuery = supabase.from('pilot_report_events').select('*').order('created_at', { ascending: false }).limit(500);
  let testsQuery = supabase.from('pilot_feature_tests').select('*').order('created_at', { ascending: false }).limit(1000);
  let feedbackQuery = supabase.from('pilot_feedback').select('*').order('created_at', { ascending: false });
  let notificationsQuery = supabase.from('pilot_notifications').select('*').order('created_at', { ascending: false }).limit(500);
  let auditQuery = supabase.from('pilot_audit_logs').select('*').order('created_at', { ascending: false }).limit(500);

  if (programId) {
    scenariosQuery = scenariosQuery.eq('program_id', programId);
    participantsQuery = participantsQuery.eq('program_id', programId);
    sessionsQuery = sessionsQuery.eq('program_id', programId);
    reportsQuery = reportsQuery.eq('program_id', programId);
    eventsQuery = eventsQuery.eq('program_id', programId);
    testsQuery = testsQuery.eq('program_id', programId);
    feedbackQuery = feedbackQuery.eq('program_id', programId);
    notificationsQuery = notificationsQuery.eq('program_id', programId);
    auditQuery = auditQuery.eq('program_id', programId);
  }
  if (campus) {
    participantsQuery = participantsQuery.eq('campus', campus);
    sessionsQuery = sessionsQuery.eq('campus', campus);
    reportsQuery = reportsQuery.eq('campus', campus);
  }

  const results = await Promise.all([
    programsQuery, scenariosQuery, participantsQuery, sessionsQuery, reportsQuery,
    eventsQuery, testsQuery, feedbackQuery, notificationsQuery, auditQuery,
  ]);
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throwError('Unable to load Pilot administration data.', firstError);

  return {
    programs: (results[0].data ?? []) as PilotAdminData['programs'],
    scenarios: (results[1].data ?? []) as PilotAdminData['scenarios'],
    participants: (results[2].data ?? []) as PilotAdminData['participants'],
    sessions: (results[3].data ?? []) as PilotAdminData['sessions'],
    reports: (results[4].data ?? []) as PilotAdminData['reports'],
    events: (results[5].data ?? []) as PilotAdminData['events'],
    featureTests: (results[6].data ?? []) as PilotAdminData['featureTests'],
    feedback: (results[7].data ?? []) as PilotAdminData['feedback'],
    notifications: (results[8].data ?? []) as PilotAdminData['notifications'],
    auditLogs: (results[9].data ?? []) as PilotAdminData['auditLogs'],
  };
}

export function calculatePilotMetrics(data: PilotAdminData): PilotDashboardMetrics {
  const invitedParticipants = data.participants.filter((item) => item.status === 'invited').length;
  const consentedParticipants = data.participants.filter((item) => ['consented', 'active', 'completed'].includes(item.status)).length;
  const activeSessions = data.sessions.filter((item) => item.status === 'in_progress').length;
  const completedSessions = data.sessions.filter((item) => item.status === 'completed').length;
  const abandonedSessions = data.sessions.filter((item) => ['abandoned', 'expired', 'withdrawn'].includes(item.status)).length;
  const completedReports = data.reports.filter((item) => item.status === 'simulation_completed').length;
  const locationTests = data.featureTests.filter((item) => item.feature_key.includes('location'));
  const attachmentTests = data.featureTests.filter((item) => item.feature_key.includes('attachment'));
  const ratings = (field: 'ease_of_use_rating' | 'confidence_rating' | 'clarity_rating') => {
    const values = data.feedback.map((item) => item[field]).filter((value): value is number => typeof value === 'number');
    return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : 0;
  };
  const percentage = (numerator: number, denominator: number) => denominator ? Number(((numerator / denominator) * 100).toFixed(1)) : 0;
  return {
    invitedParticipants,
    consentedParticipants,
    activeSessions,
    completedSessions,
    totalReports: data.reports.length,
    completedReports,
    completionRate: percentage(completedReports, data.reports.length),
    abandonmentRate: percentage(abandonedSessions, data.sessions.length),
    locationSuccessRate: percentage(locationTests.filter((item) => item.outcome === 'passed').length, locationTests.length),
    attachmentSuccessRate: percentage(attachmentTests.filter((item) => item.outcome === 'passed').length, attachmentTests.length),
    notificationReadRate: percentage(data.notifications.filter((item) => item.is_read).length, data.notifications.length),
    averageEaseRating: ratings('ease_of_use_rating'),
    averageConfidenceRating: ratings('confidence_rating'),
    averageClarityRating: ratings('clarity_rating'),
  };
}

export async function createPilotProgram(input: {
  name: string;
  description?: string | null;
  status: Database['public']['Enums']['pilot_program_status'];
  starts_at?: string | null;
  ends_at?: string | null;
  eligible_campuses: CampusLocation[];
  retention_days: number;
}): Promise<PilotProgram> {
  const { data, error } = await supabase.from('pilot_programs').insert(input).select('*').single();
  if (error || !data) throwError('Unable to create Pilot programme.', error);
  return data as PilotProgram;
}

export async function updatePilotProgram(programId: string, update: Database['public']['Tables']['pilot_programs']['Update']): Promise<PilotProgram> {
  const { data, error } = await supabase.from('pilot_programs').update(update).eq('id', programId).select('*').single();
  if (error || !data) throwError('Unable to update Pilot programme.', error);
  return data as PilotProgram;
}

export async function createPilotScenario(input: Database['public']['Tables']['pilot_scenarios']['Insert']): Promise<PilotScenario> {
  const { data, error } = await supabase.from('pilot_scenarios').insert(input).select('*').single();
  if (error || !data) throwError('Unable to create Pilot scenario.', error);
  return data as PilotScenario;
}

export async function updatePilotScenario(scenarioId: string, update: Database['public']['Tables']['pilot_scenarios']['Update']): Promise<PilotScenario> {
  const { data, error } = await supabase.from('pilot_scenarios').update(update).eq('id', scenarioId).select('*').single();
  if (error || !data) throwError('Unable to update Pilot scenario.', error);
  return data as PilotScenario;
}

export async function searchPilotStudentProfiles(searchTerm: string, campus?: CampusLocation | null): Promise<PilotStudentProfile[]> {
  let query = supabase.from('profiles').select('id, full_name, email, campus, student_number')
    .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,student_number.ilike.%${searchTerm}%`).limit(25);
  if (campus) query = query.eq('campus', campus);
  const { data, error } = await query;
  if (error) throwError('Unable to search student profiles.', error);
  return (data ?? []) as PilotStudentProfile[];
}

export async function invitePilotParticipant(input: {
  program_id: string;
  user_id: string;
  campus: CampusLocation;
}): Promise<PilotParticipant> {
  const { data, error } = await supabase.from('pilot_participants').insert(input).select('*').single();
  if (error || !data) throwError('Unable to invite Pilot participant.', error);
  return data as PilotParticipant;
}

export async function updatePilotParticipant(participantId: string, update: Database['public']['Tables']['pilot_participants']['Update']): Promise<PilotParticipant> {
  const { data, error } = await supabase.from('pilot_participants').update(update).eq('id', participantId).select('*').single();
  if (error || !data) throwError('Unable to update Pilot participant.', error);
  return data as PilotParticipant;
}

export async function transitionPilotReport(
  reportId: string,
  status: PilotReportStatus,
  notes?: string | null,
  assignedTo?: string | null,
): Promise<PilotReport> {
  const data = await invokePilotFunction<{ report: PilotReport }>('pilot-transition-status', {
    report_id: reportId,
    status,
    notes: notes ?? null,
    assigned_to: assignedTo ?? null,
  });
  return data.report;
}

export async function addPilotReportNote(reportId: string, notes: string): Promise<PilotReportEvent> {
  const { data, error } = await supabase.rpc('pilot_add_report_note', { p_report_id: reportId, p_notes: notes });
  if (error || !data) throwError('Unable to add Pilot report note.', error);
  return data as PilotReportEvent;
}

export async function createPilotNotification(input: {
  reportId: string;
  type: Database['public']['Enums']['pilot_notification_type'];
  title: string;
  message: string;
}): Promise<PilotNotification> {
  const data = await invokePilotFunction<{ result: PilotNotification }>('pilot-create-notification', {
    report_id: input.reportId,
    kind: input.type,
    title: input.title,
    content: input.message,
  });
  return data.result;
}

export async function requestPilotExport(programId: string, campus?: CampusLocation | null, identified = false): Promise<Json> {
  const { data, error } = await supabase.rpc('pilot_export_data', {
    p_program_id: programId,
    p_campus: campus ?? undefined,
    p_identified: identified,
  });
  if (error) throwError('Unable to export Pilot results.', error);
  return data;
}

export async function requestPilotReportDeletion(reportId: string, reason: string): Promise<PilotDeletionPlan> {
  const data = await invokePilotFunction<{ result: PilotDeletionPlan }>('pilot-delete-report', { report_id: reportId, reason });
  return data.result;
}

async function cleanPilotReports(reportIds: string[], reason: string): Promise<void> {
  for (const reportId of [...new Set(reportIds)]) {
    await requestPilotReportDeletion(reportId, reason);
  }
}

export async function requestPilotSessionDeletion(sessionId: string, reason: string): Promise<PilotDeletionPlan> {
  const { data: reports, error: reportsError } = await supabase.from('pilot_reports').select('id').eq('session_id', sessionId);
  if (reportsError) throwError('Unable to inspect Pilot session reports.', reportsError);
  await cleanPilotReports((reports ?? []).map((report) => report.id), `Session cleanup: ${reason}`);
  const { data, error } = await supabase.rpc('pilot_delete_session', { p_session_id: sessionId, p_reason: reason });
  if (error) throwError('Unable to complete Pilot session deletion.', error);
  return data as unknown as PilotDeletionPlan;
}

export async function requestPilotCampusPurge(programId: string, campus: CampusLocation, reason: string): Promise<PilotDeletionPlan> {
  const { data: reports, error: reportsError } = await supabase.from('pilot_reports').select('id').eq('program_id', programId).eq('campus', campus);
  if (reportsError) throwError('Unable to inspect campus Pilot reports.', reportsError);
  await cleanPilotReports((reports ?? []).map((report) => report.id), `Campus cleanup: ${reason}`);
  const { data, error } = await supabase.rpc('pilot_purge_campus', {
    p_program_id: programId,
    p_campus: campus,
    p_reason: reason,
  });
  if (error) throwError('Unable to complete campus Pilot purge.', error);
  return data as unknown as PilotDeletionPlan;
}

export async function requestPilotProgramPurge(programId: string, reason: string): Promise<PilotDeletionPlan> {
  const { data: reports, error: reportsError } = await supabase.from('pilot_reports').select('id').eq('program_id', programId);
  if (reportsError) throwError('Unable to inspect programme Pilot reports.', reportsError);
  await cleanPilotReports((reports ?? []).map((report) => report.id), `Programme cleanup: ${reason}`);
  const { data, error } = await supabase.rpc('pilot_execute_program_cleanup', {
    p_program_id: programId,
    p_reason: reason,
  });
  if (error) throwError('Unable to complete programme Pilot purge.', error);
  return data as unknown as PilotDeletionPlan;
}

export async function requestPilotRetentionPlan(): Promise<PilotDeletionPlan> {
  const { data: plan, error: planError } = await supabase.rpc('pilot_purge_expired');
  if (planError) throwError('Unable to calculate Pilot retention scope.', planError);
  const sessionIds = plan && typeof plan === 'object' && Array.isArray((plan as Record<string, unknown>).session_ids)
    ? ((plan as Record<string, unknown>).session_ids as unknown[]).filter((value): value is string => typeof value === 'string')
    : [];
  if (sessionIds.length) {
    const { data: reports, error: reportsError } = await supabase.from('pilot_reports').select('id').in('session_id', sessionIds);
    if (reportsError) throwError('Unable to inspect expired Pilot reports.', reportsError);
    await cleanPilotReports((reports ?? []).map((report) => report.id), 'Retention cleanup');
  }
  const { data, error } = await supabase.rpc('pilot_execute_expired_cleanup');
  if (error) throwError('Unable to complete Pilot retention cleanup.', error);
  return data as unknown as PilotDeletionPlan;
}

export function downloadPilotJson(filename: string, payload: Json): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function formatAuditLog(log: PilotAuditLog): string {
  return `${new Date(log.created_at).toLocaleString()} — ${log.action.replace(/_/g, ' ')} (${log.entity_type})`;
}
