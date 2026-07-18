import { authenticatePilotRequest, requireStudent } from '../_shared/pilot/auth.ts';
import { handleError, jsonResponse, readJson, requirePost, PilotHttpError } from '../_shared/pilot/http.ts';
import { enumValue, optionalBoolean, optionalNumber, optionalText, optionalUuid, requiredText, requiredUuid } from '../_shared/pilot/validation.ts';
import { writePilotAudit } from '../_shared/pilot/audit.ts';

const INCIDENT_CATEGORIES = [
  'Rape','Sexual assault','Gbv','Murder','Attempted murder','Assault common','Assault GBH','Fraud','Theft','Robbery',
  'Armed robbery','Arson','Malicious damage to property','Trespassing','Reckless and negligent driving',
  'Driving under the influence of alcohol','Public violence','Sports and Rec Events Act Violation',
  'Crimmen enjuria (Hate speech)','Cyber related crime (bullying etc.)','Vandalism',
] as const;

Deno.serve(async (req) => {
  const early = requirePost(req);
  if (early) return early;

  try {
    const context = await authenticatePilotRequest(req);
    requireStudent(context);
    const body = await readJson(req);

    const sessionId = requiredUuid(body.session_id, 'session_id');
    const scenarioId = optionalUuid(body.scenario_id, 'scenario_id');
    const title = requiredText(body.title, 'title', 160);
    const description = requiredText(body.description, 'description', 5000);
    const category = enumValue(body.category, 'category', INCIDENT_CATEGORIES);

    const { data: session, error: sessionError } = await context.adminClient
      .from('pilot_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session || session.user_id !== context.user.id || session.status !== 'in_progress') {
      throw new PilotHttpError(404, 'An active owned Pilot session is required.', 'session_not_found');
    }
    if (!context.campus || session.campus !== context.campus) {
      throw new PilotHttpError(403, 'The Pilot session campus does not match your profile.', 'campus_mismatch');
    }

    const [{ data: participant, error: participantError }, { data: program, error: programError }] = await Promise.all([
      context.adminClient.from('pilot_participants').select('*').eq('id', session.participant_id).maybeSingle(),
      context.adminClient.from('pilot_programs').select('*').eq('id', session.program_id).maybeSingle(),
    ]);
    if (participantError || programError) throw participantError ?? programError;
    if (!participant || participant.user_id !== context.user.id || !['consented','active'].includes(participant.status)) {
      throw new PilotHttpError(403, 'Pilot participation is no longer active.', 'participant_inactive');
    }
    if (!program || program.status !== 'active') {
      throw new PilotHttpError(409, 'The Pilot programme is not accepting reports.', 'programme_inactive');
    }

    if (scenarioId) {
      const { data: scenario, error: scenarioError } = await context.adminClient
        .from('pilot_scenarios')
        .select('*')
        .eq('id', scenarioId)
        .eq('program_id', session.program_id)
        .eq('is_active', true)
        .maybeSingle();
      if (scenarioError) throw scenarioError;
      if (!scenario) throw new PilotHttpError(400, 'The selected Pilot scenario is not active.', 'scenario_inactive');
      if (scenario.expected_category && scenario.expected_category !== category) {
        throw new PilotHttpError(400, 'The report category does not match the selected scenario.', 'scenario_category_mismatch');
      }
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
        is_anonymous: optionalBoolean(body.is_anonymous),
        location_lat: optionalNumber(body.location_lat, 'location_lat', -90, 90),
        location_lng: optionalNumber(body.location_lng, 'location_lng', -180, 180),
        location_accuracy: optionalNumber(body.location_accuracy, 'location_accuracy', 0, 100000),
        location_description: optionalText(body.location_description, 'location_description', 500),
      })
      .select('*')
      .single();
    if (reportError || !report) throw reportError ?? new Error('Report submission returned no record.');

    await context.adminClient.from('pilot_sessions').update({ last_activity_at: new Date().toISOString() }).eq('id', session.id);
    await writePilotAudit(context.adminClient, {
      programId: session.program_id,
      actorId: context.user.id,
      actorRole: context.role,
      actorCampus: context.campus,
      action: 'report_submitted',
      entityType: 'pilot_report',
      entityId: report.id,
      metadata: { edge_function: 'pilot-submit-report', scenario_id: scenarioId },
    });

    return jsonResponse({ report }, 201);
  } catch (error) {
    return handleError(error);
  }
});
