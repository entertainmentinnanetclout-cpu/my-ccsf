import { authenticatePilotRequest, requireStudent } from '../_shared/pilot/auth.ts';
import { ensurePilotParticipant } from '../_shared/pilot/enrolment.ts';
import { handleError, jsonResponse, requirePost, PilotHttpError } from '../_shared/pilot/http.ts';
import { writePilotAudit } from '../_shared/pilot/audit.ts';

Deno.serve(async (req) => {
  const early = requirePost(req);
  if (early) return early;

  try {
    const context = await authenticatePilotRequest(req);
    requireStudent(context);
    if (!context.campus) {
      throw new PilotHttpError(409, 'Complete your student campus profile before entering Pilot Mode.', 'campus_required');
    }

    const result = await ensurePilotParticipant(context.adminClient, context.user.id, context.campus);

    if (result.created) {
      await writePilotAudit(context.adminClient, {
        programId: result.program.id,
        actorId: context.user.id,
        actorRole: context.role,
        actorCampus: context.campus,
        action: 'participant_self_enrolled',
        entityType: 'pilot_participant',
        entityId: result.participant.id,
        metadata: { edge_function: 'pilot-enrol-student' },
      });
    }

    return jsonResponse({
      participant: result.participant,
      program: result.program,
      created: result.created,
    }, result.created ? 201 : 200);
  } catch (error) {
    return handleError(error);
  }
});
