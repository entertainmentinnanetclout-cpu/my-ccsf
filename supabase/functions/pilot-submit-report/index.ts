import { authenticatePilotRequest, requireStudent } from '../_shared/pilot/auth.ts';
import { handleError, jsonResponse, readJson, requirePost, PilotHttpError } from '../_shared/pilot/http.ts';
import { optionalBoolean, optionalNumber, optionalText, optionalUuid, requiredText, requiredUuid } from '../_shared/pilot/validation.ts';
import { writePilotAudit } from '../_shared/pilot/audit.ts';

const EMERGENCY_TITLE = 'Emergency assistance request';
const EMERGENCY_DESCRIPTION = 'Emergency assistance requested. The student may be unable to provide further details.';
const EMERGENCY_FALLBACK_CATEGORY = 'Public violence';
const MAX_EVIDENCE_FILES = 3;

const isProgrammeOpen = (program: {
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  eligible_campuses: string[];
}, campus: string) => {
  const now = Date.now();
  return program.status === 'active'
    && (!program.starts_at || new Date(program.starts_at).getTime() <= now)
    && (!program.ends_at || new Date(program.ends_at).getTime() >= now)
    && program.eligible_campuses.includes(campus);
};

Deno.serve(async (req) => {
  const early = requirePost(req);
  if (early) return early;

  try {
    const context = await authenticatePilotRequest(req);
    requireStudent(context);
    const body = await readJson(req);

    const sessionId = requiredUuid(body.session_id, 'session_id');
    const requestedScenarioId = optionalUuid(body.scenario_id, 'scenario_id');
    const submissionId = optionalUuid(body.submission_id, 'submission_id');
    const submittedOffline = optionalBoolean(body.submitted_offline);
    const evidenceManifest = Array.isArray(body.evidence_manifest)
      ? body.evidence_manifest as Array<Record<string, unknown>>
      : [];
    if (evidenceManifest.length > MAX_EVIDENCE_FILES) {
      throw new PilotHttpError(400, `A maximum of ${MAX_EVIDENCE_FILES} evidence files is allowed.`, 'attachment_limit_exceeded');
    }

    const { data: session, error: sessionError } = await context.adminClient
      .from('pilot_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session || session.user_id !== context.user.id || session.status !== 'in_progress') {
      throw new PilotHttpError(404, 'An active owned Pilot session is required.', 'session_not_found');
    }
    if (new Date(session.expires_at).getTime() <= Date.now()) {
      throw new PilotHttpError(409, 'The Pilot session has expired.', 'session_expired');
    }
    if (!context.campus || session.campus !== context.campus) {
      throw new PilotHttpError(403, 'The Pilot session campus does not match your profile.', 'campus_mismatch');
    }

    const [{ data: participant, error: participantError }, { data: program, error: programError }] = await Promise.all([
      context.adminClient.from('pilot_participants').select('*').eq('id', session.participant_id).maybeSingle(),
      context.adminClient.from('pilot_programs').select('*').eq('id', session.program_id).maybeSingle(),
    ]);
    if (participantError || programError) throw participantError ?? programError;
    if (!participant
      || participant.user_id !== context.user.id
      || participant.program_id !== session.program_id
      || participant.campus !== session.campus
      || !['consented', 'active'].includes(participant.status)) {
      throw new PilotHttpError(403, 'Pilot participation is no longer active for this campus.', 'participant_inactive');
    }
    if (!program || !isProgrammeOpen(program, session.campus)) {
      throw new PilotHttpError(409, 'The Pilot programme is not active for this campus.', 'programme_inactive');
    }

    let submissionDraft: {
      id: string;
      user_id: string;
      program_id: string | null;
      session_id: string | null;
      participant_id: string | null;
      scenario_id: string | null;
      campus: string | null;
      scope: string;
      status: string;
      expires_at: string;
      required_evidence: boolean;
      payload: Record<string, unknown>;
    } | null = null;

    if (submissionId) {
      const { data, error } = await context.adminClient
        .from('evidence_submission_drafts')
        .select('*')
        .eq('id', submissionId)
        .maybeSingle();
      if (error) throw error;
      submissionDraft = data as typeof submissionDraft;
      if (!submissionDraft
        || submissionDraft.user_id !== context.user.id
        || submissionDraft.scope !== 'pilot'
        || submissionDraft.program_id !== session.program_id
        || submissionDraft.session_id !== session.id
        || submissionDraft.participant_id !== participant.id
        || submissionDraft.campus !== session.campus) {
        throw new PilotHttpError(403, 'The evidence submission does not belong to this Pilot session.', 'submission_context_mismatch');
      }
      if (submissionDraft.expires_at && new Date(submissionDraft.expires_at).getTime() <= Date.now()) {
        throw new PilotHttpError(409, 'The evidence submission has expired.', 'submission_expired');
      }
      if (requestedScenarioId && submissionDraft.scenario_id !== requestedScenarioId) {
        throw new PilotHttpError(400, 'The evidence submission scenario does not match the request.', 'submission_scenario_mismatch');
      }
    }

    const scenarioId = submissionDraft?.scenario_id ?? requestedScenarioId;
    let scenario: {
      id: string;
      scenario_type: string;
      expected_category: string | null;
      simulated_severity: string;
      routing_destination: string;
      simulation_notice: string;
      requires_location: boolean;
      requires_live_tracking: boolean;
      requires_attachment: boolean;
    } | null = null;

    if (scenarioId) {
      const { data, error: scenarioError } = await context.adminClient
        .from('pilot_scenarios')
        .select('id, scenario_type, expected_category, simulated_severity, routing_destination, simulation_notice, requires_location, requires_live_tracking, requires_attachment')
        .eq('id', scenarioId)
        .eq('program_id', session.program_id)
        .eq('is_active', true)
        .maybeSingle();
      if (scenarioError) throw scenarioError;
      if (!data) throw new PilotHttpError(400, 'The selected Pilot scenario is not active.', 'scenario_inactive');
      if (data.routing_destination !== 'campus_security') {
        throw new PilotHttpError(409, 'The selected Pilot scenario has an unsupported routing destination.', 'routing_invalid');
      }
      scenario = data;
    }

    const source = submissionDraft?.payload ?? body;
    const emergency = scenario?.scenario_type === 'emergency_simulation';
    const locationRequired = emergency || scenario?.requires_location === true || scenario?.requires_live_tracking === true;
    const emergencyConsent = optionalBoolean(source.emergency_consent ?? body.emergency_consent);
    if (emergency && !emergencyConsent) {
      throw new PilotHttpError(400, 'Emergency location and profile-sharing consent is required.', 'emergency_consent_required');
    }
    if (!emergency && (scenario?.requires_attachment || submissionDraft?.required_evidence) && evidenceManifest.length === 0) {
      throw new PilotHttpError(400, 'This Pilot scenario requires evidence before the report can be submitted.', 'attachment_required');
    }

    const title = emergency
      ? optionalText(source.title, 'title', 160) ?? EMERGENCY_TITLE
      : requiredText(source.title, 'title', 160);
    const description = emergency
      ? optionalText(source.description, 'description', 5000) ?? EMERGENCY_DESCRIPTION
      : requiredText(source.description, 'description', 5000);
    const category = emergency
      ? optionalText(source.category, 'category', 120) ?? scenario?.expected_category ?? EMERGENCY_FALLBACK_CATEGORY
      : requiredText(source.category, 'category', 120);

    if (scenario?.expected_category && scenario.expected_category !== category) {
      throw new PilotHttpError(400, 'The report category does not match the selected scenario.', 'scenario_category_mismatch');
    }

    const locationLat = optionalNumber(source.location_lat, 'location_lat', -90, 90);
    const locationLng = optionalNumber(source.location_lng, 'location_lng', -180, 180);
    const locationAccuracy = optionalNumber(source.location_accuracy, 'location_accuracy', 0, 100000);
    const locationDescription = locationRequired
      ? requiredText(source.location_description, 'location_description', 500)
      : optionalText(source.location_description, 'location_description', 500);

    if ((locationLat === null) !== (locationLng === null)) {
      throw new PilotHttpError(400, 'Latitude and longitude must be provided together.', 'report_location_pair_invalid');
    }
    if (locationRequired && (locationLat === null || locationLng === null)) {
      throw new PilotHttpError(400, 'The selected Pilot scenario requires a captured location.', 'report_location_required');
    }

    let report: Record<string, unknown>;
    let receipt: Record<string, unknown> | null = null;

    if (submissionDraft) {
      const { data, error } = await context.adminClient.rpc('finalize_pilot_evidence_submission', {
        p_submission_id: submissionDraft.id,
        p_actor_id: context.user.id,
        p_title: title,
        p_description: description,
        p_category: category,
        p_is_anonymous: optionalBoolean(source.is_anonymous),
        p_location_lat: locationLat,
        p_location_lng: locationLng,
        p_location_accuracy: locationAccuracy,
        p_location_description: locationDescription,
        p_evidence: evidenceManifest,
        p_submitted_offline: submittedOffline,
      });
      if (error || !data) throw error ?? new Error('Pilot evidence finalisation returned no record.');
      const result = data as { report?: Record<string, unknown>; receipt?: Record<string, unknown> };
      if (!result.report || !result.receipt) throw new Error('Pilot evidence finalisation returned an incomplete result.');
      report = result.report;
      receipt = result.receipt;
    } else {
      const { data, error: reportError } = await context.adminClient
        .from('pilot_reports')
        .insert({
          program_id: session.program_id,
          participant_id: session.participant_id,
          session_id: session.id,
          scenario_id: scenarioId,
          submitted_by: context.user.id,
          campus: session.campus,
          title,
          description,
          category,
          reference_number: '',
          is_anonymous: emergency ? false : optionalBoolean(source.is_anonymous),
          location_lat: locationLat,
          location_lng: locationLng,
          location_accuracy: locationAccuracy,
          location_description: locationDescription,
        })
        .select('*')
        .single();
      if (reportError || !data) throw reportError ?? new Error('Report submission returned no record.');
      report = data as Record<string, unknown>;

      const { data: receiptData, error: receiptError } = await context.adminClient
        .from('submission_receipts')
        .insert({
          scope: 'pilot',
          user_id: context.user.id,
          pilot_report_id: report.id,
          reference_number: report.reference_number,
          campus: session.campus,
          evidence_count: 0,
          payload: { category, anonymous: emergency ? false : optionalBoolean(source.is_anonymous), status: report.status, simulation_only: true },
        })
        .select('*')
        .single();
      if (receiptError) throw receiptError;
      receipt = receiptData as Record<string, unknown>;
    }

    if (report.routing_campus !== session.campus
      || report.routing_destination !== 'campus_security'
      || !report.simulated_severity
      || !report.simulation_notice) {
      throw new PilotHttpError(500, 'Pilot report routing verification failed.', 'routing_verification_failed');
    }

    await context.adminClient
      .from('pilot_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', session.id);

    await writePilotAudit(context.adminClient, {
      programId: session.program_id,
      actorId: context.user.id,
      actorRole: context.role,
      actorCampus: context.campus,
      action: emergency ? 'emergency_report_submitted' : 'report_submitted',
      entityType: 'pilot_report',
      entityId: String(report.id),
      metadata: {
        edge_function: 'pilot-submit-report',
        scenario_id: scenarioId,
        submission_id: submissionDraft?.id ?? null,
        evidence_count: evidenceManifest.length,
        evidence_first: Boolean(submissionDraft),
        submitted_offline: submittedOffline,
        minimal_emergency_flow: emergency,
        emergency_consent: emergency ? true : null,
        location_required: locationRequired,
        location_description: locationDescription,
        simulation_only: true,
        simulated_severity: report.simulated_severity,
        routing_destination: report.routing_destination,
        routing_campus: report.routing_campus,
        external_dispatch: false,
      },
    });

    return jsonResponse({ report, receipt }, 201);
  } catch (error) {
    return handleError(error);
  }
});
