import { authenticatePilotRequest } from '../_shared/pilot/auth.ts';
import { handleError, jsonResponse, readJson, requirePost, PilotHttpError } from '../_shared/pilot/http.ts';
import { requiredText, requiredUuid } from '../_shared/pilot/validation.ts';
import { removePilotStoragePaths, storagePathsFromPlan } from '../_shared/pilot/storage.ts';

Deno.serve(async (req) => {
  const early = requirePost(req);
  if (early) return early;

  try {
    const context = await authenticatePilotRequest(req);
    const body = await readJson(req);
    const sessionId = requiredUuid(body.session_id, 'session_id');
    const reason = requiredText(body.reason, 'reason', 1000);

    const { data: plan, error: planError } = await context.callerClient.rpc('pilot_delete_session', {
      p_session_id: sessionId,
      p_reason: reason,
    });
    if (planError || !plan) throw planError ?? new Error('Deletion planning returned no result.');

    const status = typeof plan === 'object' && plan ? String((plan as Record<string, unknown>).status ?? '') : '';
    if (status === 'deleted' || status === 'already_deleted') return jsonResponse({ result: plan });
    if (status !== 'storage_cleanup_required') {
      throw new PilotHttpError(409, 'The Pilot session is not ready for deletion.', 'deletion_not_ready');
    }

    const paths = storagePathsFromPlan(plan);
    await removePilotStoragePaths(context.adminClient, paths);

    const { data: result, error: finaliseError } = await context.adminClient.rpc('pilot_finalize_delete_session', {
      p_session_id: sessionId,
      p_reason: reason,
      p_actor_id: context.user.id,
    });
    if (finaliseError || !result) throw finaliseError ?? new Error('Deletion finalisation returned no result.');

    return jsonResponse({ result });
  } catch (error) {
    return handleError(error);
  }
});
