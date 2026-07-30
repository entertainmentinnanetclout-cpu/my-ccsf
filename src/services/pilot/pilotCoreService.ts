import { supabase } from '@/integrations/supabase/client';
import { createAuditedEvidenceLink } from '@/services/evidenceAccessService';
import { invokePilotFunction } from '@/services/pilot/pilotEdgeService';
import {
  PILOT_ALLOWED_MIME_TYPES,
  PILOT_ATTACHMENT_BUCKET,
  PILOT_MAX_ATTACHMENTS,
  PILOT_MAX_FILE_BYTES,
} from '@/config/pilot';
import type {
  PilotAttachment,
  PilotDeviceInfo,
  PilotFeatureTest,
  PilotFeedbackInput,
  PilotLocationEvent,
  PilotNotification,
  PilotParticipant,
  PilotProgram,
  PilotReport,
  PilotReportEvent,
  PilotReportInput,
  PilotScenario,
  PilotSession,
  PilotTestOutcome,
} from '@/types/pilot';
import type { Database, Json } from '@/integrations/supabase/types';

const fail = (message: string, error?: unknown): never => {
  if (error) console.error(message, error);
  throw error instanceof Error ? error : new Error(message);
};

export function collectPilotDeviceInfo(): PilotDeviceInfo {
  const ua = navigator.userAgent;
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  const browserName = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  const browserVersion = ua.match(/(?:Edg|Chrome|Firefox|Version)\/([\d.]+)/)?.[1] ?? null;
  const operatingSystem = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
  const deviceType = /Mobi|Android|iPhone|iPad/.test(ua) ? 'mobile' : 'desktop';
  return {
    device_type: deviceType,
    browser_name: browserName,
    browser_version: browserVersion,
    operating_system: operatingSystem,
    viewport_width: window.innerWidth || null,
    viewport_height: window.innerHeight || null,
    network_type: connection?.effectiveType ?? null,
  };
}

export function isPilotSessionActive(session: PilotSession | null | undefined): session is PilotSession {
  if (!session || session.status !== 'in_progress') return false;
  const expiry = new Date(session.expires_at).getTime();
  return Number.isFinite(expiry) && expiry > Date.now() + 15_000;
}

export async function loadStudentPilotContext(userId: string): Promise<{
  participant: PilotParticipant | null;
  program: PilotProgram | null;
  session: PilotSession | null;
}> {
  const { data: participants, error } = await supabase
    .from('pilot_participants')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['invited', 'consented', 'active'])
    .order('created_at', { ascending: false });
  if (error) fail('Unable to load Pilot participation.', error);

  const participant = (participants?.[0] ?? null) as PilotParticipant | null;
  if (!participant) return { participant: null, program: null, session: null };

  const nowIso = new Date().toISOString();
  const [{ data: program, error: programError }, { data: sessions, error: sessionError }] = await Promise.all([
    supabase.from('pilot_programs').select('*').eq('id', participant.program_id).maybeSingle(),
    supabase
      .from('pilot_sessions')
      .select('*')
      .eq('participant_id', participant.id)
      .eq('status', 'in_progress')
      .gt('expires_at', nowIso)
      .order('started_at', { ascending: false })
      .limit(1),
  ]);
  if (programError) fail('Unable to load Pilot programme.', programError);
  if (sessionError) fail('Unable to load Pilot session.', sessionError);
  return {
    participant,
    program: (program ?? null) as PilotProgram | null,
    session: (sessions?.[0] ?? null) as PilotSession | null,
  };
}

export async function consentToPilot(participantId: string, consentVersion: string): Promise<PilotParticipant> {
  const { data, error } = await supabase.rpc('pilot_consent_participation', {
    p_participant_id: participantId,
    p_consent_version: consentVersion,
  });
  if (error || !data) fail('Unable to record Pilot consent.', error);
  return data as PilotParticipant;
}

export async function createPilotSession(participant: PilotParticipant): Promise<PilotSession> {
  const data = await invokePilotFunction<{ session: PilotSession }>('pilot-create-session', {
    participant_id: participant.id,
    device: collectPilotDeviceInfo(),
  });
  return data.session;
}

export async function ensureActivePilotSession(
  participant: PilotParticipant,
  session?: PilotSession | null,
): Promise<PilotSession> {
  if (isPilotSessionActive(session)) return session;
  return createPilotSession(participant);
}

export async function loadPilotSession(sessionId: string): Promise<PilotSession | null> {
  const { data, error } = await supabase.from('pilot_sessions').select('*').eq('id', sessionId).maybeSingle();
  if (error) fail('Unable to load Pilot session.', error);
  return (data ?? null) as PilotSession | null;
}

export async function updatePilotSession(
  sessionId: string,
  update: Partial<Pick<PilotSession, 'status' | 'last_activity_at' | 'completed_at'>>,
): Promise<PilotSession> {
  const { data, error } = await supabase
    .from('pilot_sessions')
    .update({ ...update, last_activity_at: update.last_activity_at ?? new Date().toISOString() })
    .eq('id', sessionId)
    .select('*')
    .single();
  if (error || !data) fail('Unable to update Pilot session.', error);
  return data as PilotSession;
}

export async function withdrawPilotSession(sessionId: string, reason: string): Promise<Json> {
  const { data, error } = await supabase.rpc('pilot_withdraw_session', {
    p_session_id: sessionId,
    p_reason: reason,
  });
  if (error) fail('Unable to withdraw from the Pilot session.', error);
  return data;
}

export async function loadPilotScenarios(programId: string): Promise<PilotScenario[]> {
  const { data, error } = await supabase
    .from('pilot_scenarios')
    .select('*')
    .eq('program_id', programId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error) fail('Unable to load Pilot scenarios.', error);
  return (data ?? []) as PilotScenario[];
}

export async function createPilotReport(input: PilotReportInput): Promise<PilotReport> {
  const data = await invokePilotFunction<{ report: PilotReport }>('pilot-submit-report', {
    session_id: input.session_id,
    scenario_id: input.scenario_id ?? null,
    title: input.title,
    description: input.description,
    category: input.category,
    is_anonymous: input.is_anonymous ?? false,
    emergency_consent: input.emergency_consent ?? false,
    location_lat: input.location_lat ?? null,
    location_lng: input.location_lng ?? null,
    location_accuracy: input.location_accuracy ?? null,
    location_description: input.location_description ?? null,
  });
  return data.report;
}

export async function loadOwnPilotReports(sessionId?: string): Promise<PilotReport[]> {
  let query = supabase.from('pilot_reports').select('*').order('submitted_at', { ascending: false });
  if (sessionId) query = query.eq('session_id', sessionId);
  const { data, error } = await query;
  if (error) fail('Unable to load Pilot reports.', error);
  return (data ?? []) as PilotReport[];
}

export async function loadPilotReport(reportId: string): Promise<PilotReport | null> {
  const { data, error } = await supabase.from('pilot_reports').select('*').eq('id', reportId).maybeSingle();
  if (error) fail('Unable to load Pilot report.', error);
  return (data ?? null) as PilotReport | null;
}

export async function loadPilotReportEvents(reportId: string): Promise<PilotReportEvent[]> {
  const { data, error } = await supabase.from('pilot_report_events').select('*').eq('report_id', reportId).order('created_at', { ascending: true });
  if (error) fail('Unable to load Pilot report timeline.', error);
  return (data ?? []) as PilotReportEvent[];
}

export async function insertPilotLocationEvent(input: Database['public']['Tables']['pilot_location_events']['Insert']): Promise<PilotLocationEvent> {
  const { data, error } = await supabase.from('pilot_location_events').insert(input).select('*').single();
  if (error || !data) fail('Unable to record Pilot location test.', error);
  return data as PilotLocationEvent;
}

export function validatePilotFiles(files: File[]): void {
  if (files.length > PILOT_MAX_ATTACHMENTS) fail(`A maximum of ${PILOT_MAX_ATTACHMENTS} files is allowed.`);
  for (const file of files) {
    if (file.size <= 0 || file.size > PILOT_MAX_FILE_BYTES) fail(`${file.name} exceeds the 10 MB Pilot limit.`);
    if (!PILOT_ALLOWED_MIME_TYPES.includes(file.type as (typeof PILOT_ALLOWED_MIME_TYPES)[number])) fail(`${file.name} has an unsupported file type.`);
  }
}

export async function uploadPilotAttachments(report: PilotReport, files: File[], userId: string): Promise<PilotAttachment[]> {
  validatePilotFiles(files);
  const uploaded: PilotAttachment[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${report.program_id}/${report.campus}/${userId}/${report.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from(PILOT_ATTACHMENT_BUCKET).upload(storagePath, file, {
      cacheControl: '3600', contentType: file.type, upsert: false,
    });
    if (uploadError) fail(`Unable to upload ${file.name}.`, uploadError);
    const { data, error } = await supabase.from('pilot_attachments').insert({
      program_id: report.program_id,
      session_id: report.session_id,
      report_id: report.id,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    }).select('*').single();
    if (error || !data) fail('The file uploaded but its Pilot metadata could not be recorded.', error);
    uploaded.push(data as PilotAttachment);
  }
  return uploaded;
}

export async function loadPilotAttachments(reportId: string): Promise<PilotAttachment[]> {
  const { data, error } = await supabase.from('pilot_attachments').select('*').eq('report_id', reportId).order('created_at', { ascending: true });
  if (error) fail('Unable to load Pilot attachments.', error);
  return (data ?? []) as PilotAttachment[];
}

export async function createPilotAttachmentSignedUrl(storagePath: string, _expiresIn = 300): Promise<string> {
  const reportId = storagePath.split('/')[3];
  if (!reportId) fail('The Pilot attachment path is invalid.');
  return createAuditedEvidenceLink({ scope: 'pilot', objectPath: storagePath, action: 'preview', pilotReportId: reportId });
}

export async function recordPilotFeatureTest(input: {
  programId: string;
  sessionId: string;
  reportId?: string | null;
  featureKey: string;
  outcome: PilotTestOutcome;
  durationMs?: number | null;
  errorCode?: string | null;
  metadata?: Json;
}): Promise<PilotFeatureTest> {
  const { data, error } = await supabase.from('pilot_feature_tests').insert({
    program_id: input.programId,
    session_id: input.sessionId,
    report_id: input.reportId ?? null,
    feature_key: input.featureKey,
    outcome: input.outcome,
    duration_ms: input.durationMs ?? null,
    error_code: input.errorCode ?? null,
    metadata: input.metadata ?? {},
  }).select('*').single();
  if (error || !data) fail('Unable to record Pilot feature result.', error);
  return data as PilotFeatureTest;
}

export async function savePilotFeedback(input: PilotFeedbackInput): Promise<void> {
  const { error } = await supabase.from('pilot_feedback').upsert(input, { onConflict: 'session_id,user_id' });
  if (error) fail('Unable to save Pilot feedback.', error);
}

export async function loadPilotNotifications(): Promise<PilotNotification[]> {
  const { data, error } = await supabase.from('pilot_notifications').select('*').order('created_at', { ascending: false });
  if (error) fail('Unable to load Pilot notifications.', error);
  return (data ?? []) as PilotNotification[];
}

export async function markPilotNotificationRead(notificationId: string): Promise<PilotNotification> {
  const { data, error } = await supabase.rpc('pilot_mark_notification_read', { p_notification_id: notificationId });
  if (error || !data) fail('Unable to mark Pilot notification read.', error);
  return data as PilotNotification;
}

export function subscribeToPilotReport(reportId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`pilot-report-${reportId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pilot_reports', filter: `id=eq.${reportId}` }, onChange)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pilot_report_events', filter: `report_id=eq.${reportId}` }, onChange)
    .subscribe();
  return () => void supabase.removeChannel(channel);
}

export function subscribeToPilotNotifications(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`pilot-notifications-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pilot_notifications', filter: `user_id=eq.${userId}` }, onChange)
    .subscribe();
  return () => void supabase.removeChannel(channel);
}
