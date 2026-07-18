import { authenticatePilotRequest, requireStaff } from '../_shared/pilot/auth.ts';
import { handleError, jsonResponse, readJson, requirePost, PilotHttpError } from '../_shared/pilot/http.ts';
import { optionalBoolean, optionalText, requiredUuid } from '../_shared/pilot/validation.ts';

Deno.serve(async (req) => {
  const early = requirePost(req);
  if (early) return early;

  try {
    const context = await authenticatePilotRequest(req);
    requireStaff(context);
    const body = await readJson(req);
    const programId = requiredUuid(body.program_id, 'program_id');
    const requestedCampus = optionalText(body.campus, 'campus', 80);
    const identified = optionalBoolean(body.identified, false);

    if (context.role === 'security') {
      if (!context.campus) throw new PilotHttpError(403, 'A campus assignment is required.', 'campus_required');
      if (requestedCampus && requestedCampus !== context.campus) {
        throw new PilotHttpError(403, 'Campus exports are restricted to your assigned campus.', 'campus_scope_denied');
      }
      if (identified) throw new PilotHttpError(403, 'Identified exports require super-admin authority.', 'identified_export_denied');
    }

    const { data, error } = await context.callerClient.rpc('pilot_export_data', {
      p_program_id: programId,
      p_campus: context.role === 'security' ? context.campus : requestedCampus ?? undefined,
      p_identified: identified,
    });
    if (error) throw error;

    return jsonResponse({
      export: data,
      metadata: {
        generated_at: new Date().toISOString(),
        identified,
        campus: context.role === 'security' ? context.campus : requestedCampus,
        edge_function: 'pilot-export-results',
      },
    });
  } catch (error) {
    return handleError(error);
  }
});
