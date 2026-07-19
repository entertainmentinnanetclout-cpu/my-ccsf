import { authenticatePilotRequest, requireStudent } from '../_shared/pilot/auth.ts';
import { handleError, jsonResponse, readJson, requirePost, PilotHttpError } from '../_shared/pilot/http.ts';
import { requiredUuid, optionalText, optionalNumber } from '../_shared/pilot/validation.ts';
import { writePilotAudit } from '../_shared/pilot/audit.ts';

Deno.serve(async (req) => {
  const early = requirePost(req);
  if (early) return early;

  try {
    const context = await authenticatePilotRequest(req);
    requireStudent(context);
    const body = await readJson(req);
    const participantId = requiredUuid(body.participant_id, 'participant_id');

    const { data: participant, error: participantError } = await context.adminClient
      .from('pilot_participants')
      .select('*')
      .eq('id', participantId)
      .maybeSingle();
    if (participantError) throw participantError;
    if (!participant || participant.user_id !== context.user.id) {
      throw new PilotHttpError(404, 'Pilot participation was not found.', 'participant_not_found');
    }
    if (!['consented', 'active'].includes(participant.status)) {
      throw new PilotHttpError(409, 'Pilot consent is required before starting a session.', 'consent_required');
    }
    if (!context.campus || participant.campus !== context.campus) {
      throw new PilotHttpError(403, 'Participant campus does not match the authenticated profile.', 'campus_mismatch');
    }

    const { data: program, error: programError } = await context.adminClient
      .from('pilot_programs')
      .select('*')
      .eq('id', participant.program_id)
      .maybeSingle();
    if (programError) throw programError;
    const now = Date.now();
    const activeWindow = program
      && program.status === 'active'
      && (!program.starts_at || new Date(program.starts_at).getTime() <= now)
      && (!program.ends_at || new Date(program.ends_at).getTime() >= now)
      && Array.isArray(program.eligible_campuses)
      && program.eligible_campuses.includes(context.campus);
    if (!activeWindow) throw new PilotHttpError(409, 'The Pilot programme is not currently accepting sessions.', 'programme_inactive');

    const { data: existing, error: existingError } = await context.adminClient
      .from('pilot_sessions')
      .select('*')
      .eq('participant_id', participant.id)
      .eq('status', 'in_progress')
      .gt('expires_at', new Date().toISOString())
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return jsonResponse({ session: existing, resumed: true });

    const device = body.device && typeof body.device === 'object' && !Array.isArray(body.device)
      ? body.device as Record<string, unknown>
      : {};

    const { data: session, error: sessionError } = await context.adminClient
      .from('pilot_sessions')
      .insert({
        program_id: participant.program_id,
        participant_id: participant.id,
        user_id: context.user.id,
        campus: participant.campus,
        device_type: optionalText(device.device_type, 'device_type', 40),
        browser_name: optionalText(device.browser_name, 'browser_name', 80),
        browser_version: optionalText(device.browser_version, 'browser_version', 80),
        operating_system: optionalText(device.operating_system, 'operating_system', 80),
        viewport_width: optionalNumber(device.viewport_width, 'viewport_width', 1, 20000),
        viewport_height: optionalNumber(device.viewport_height, 'viewport_height', 1, 20000),
        network_type: optionalText(device.network_type, 'network_type', 40),
      })
      .select('*')
      .single();
    if (sessionError || !session) throw sessionError ?? new Error('Session creation returned no record.');

    await context.adminClient.from('pilot_participants').update({ status: 'active' }).eq('id', participant.id);
    await writePilotAudit(context.adminClient, {
      programId: participant.program_id,
      actorId: context.user.id,
      actorRole: context.role,
      actorCampus: context.campus,
      action: 'session_created',
      entityType: 'pilot_session',
      entityId: session.id,
      metadata: { edge_function: 'pilot-create-session' },
    });

    return jsonResponse({ session, resumed: false }, 201);
  } catch (error) {
    return handleError(error);
  }
});
