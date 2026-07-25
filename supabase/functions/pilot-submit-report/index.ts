import { authenticatePilotRequest, requireStudent } from '../_shared/pilot/auth.ts';
import { handleError, jsonResponse, readJson, requirePost, PilotHttpError } from '../_shared/pilot/http.ts';
import { optionalBoolean, optionalNumber, optionalText, optionalUuid, requiredText, requiredUuid } from '../_shared/pilot/validation.ts';
import { writePilotAudit } from '../_shared/pilot/audit.ts';

const EMERGENCY_TITLE = 'Emergency assistance request';
const EMERGENCY_DESCRIPTION = 'Emergency assistance requested. The student may be unable to provide further details.';
const EMERGENCY_FALLBACK_CATEGORY = 'Public violence';

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
    const scenarioId = optionalUuid(body.scenario_id, 'scenario_id');

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

    let scenario: {
      id: string;
      scenario_type: string;
      expected_category: string | null;
      simulated_severity: string;
      routing_destination: string;
      simulation_notice: string;
      requires_location: boolean;
      requires_live_tracking: boolean;
    } | null = null;

    if (scenarioId) {
      const { data, error: scenarioError } = await context.adminClient
        .from('pilot_scenarios')
        .select('id, scenario_type, expected_category, simulated_severity, routing_destination, simulation_notice, requires_location, requires_live_tracking')
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

    const emergency = scenario?.scenario_type === 'emergency_simulation';
    const locationRequired = emergency || scenario?.requires_location === true || scenario?.requires_live_tracking === true;
    const emergencyConsent = optionalBoolean(body.emergency_consent);
    if (emergency && !emergencyConsent) {
      throw new PilotHttpError(400, 'Emergency location and profile-sharing consent is required.', 'emergency_consent_required');
    }

    const title = emergency
      ? optionalText(body.title, 'title', 160) ?? EMERGENCY_TITLE
      : requiredText(body.title, 'title', 160);
    const description = emergency
      ? optionalText(body.description, 'description', 5000) ?? EMERGENCY_DESCRIPTION
      : requiredText(body.description, 'description', 5000);
    const category = emergency
      ? optionalText(body.category, 'category', 120) ?? scenario?.expected_category ?? EMERGENCY_FALLBACK_CATEGORY
      : requiredText(body.category, 'category', 120);

    if (scenario?.expected_category && scenario.expected_category !== category) {
      throw new PilotHttpError(400, 'The report category does not match the selected scenario.', 'scenario_category_mismatch');
    }

    const locationLat = optionalNumber(body.location_lat, 'location_lat', -90, 90);
    const locationLng = optionalNumber(body.location_lng, 'location_lng', -180, 180);
    const locationAccuracy = optionalNumber(body.location_accuracy, 'location_accuracy', 0, 100000);
    const locationDescription = locationRequired
      ? requiredText(body.location_description, 'location_description', 500)
      : optionalText(body.location_description, 'location_description', 500);

    if ((locationLat === null) !== (locationLng === null)) {
      throw new PilotHttpError(400, 'Latitude and longitude must be provided together.', 'report_location_pair_invalid');
    }
    if (locationRequired && (locationLat === null || locationLng === null)) {
      throw new PilotHttpError(400, 'The selected Pilot scenario requires a captured location.', 'report_location_required');
    }

    const { data: report, error: reportError } = await context.adminClient
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
        is_anonymous: emergency ? false : optionalBoolean(body.is_anonymous),
        location_lat: locationLat,
        location_lng: locationLng,
        location_accuracy: locationAccuracy,
        location_description: locationDescription,
      })
      .select('*')
      .single();
    if (reportError || !report) throw reportError ?? new Error('Report submission returned no record.');

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
      entityId: report.id,
      metadata: {
        edge_function: 'pilot-submit-report',
        scenario_id: scenarioId,
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

    return jsonResponse({ report }, 201);
  } catch (error) {
    return handleError(error);
  }
});
