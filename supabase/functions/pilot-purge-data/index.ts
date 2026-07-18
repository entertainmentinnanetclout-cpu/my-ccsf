import { authenticatePilotRequest, requireStaff, requireSuperAdmin } from '../_shared/pilot/auth.ts';
import { handleError, jsonResponse, readJson, requirePost, PilotHttpError } from '../_shared/pilot/http.ts';
import { enumValue, requiredText, requiredUuid } from '../_shared/pilot/validation.ts';
import { removePilotStoragePaths, storagePathsFromPlan } from '../_shared/pilot/storage.ts';

const OPERATIONS = ['campus','program','expired'] as const;

Deno.serve(async (req) => {
  const early = requirePost(req);
  if (early) return early;

  try {
    const context = await authenticatePilotRequest(req);
    requireStaff(context);
    const body = await readJson(req);
    const operation = enumValue(body.operation, 'operation', OPERATIONS);

    if (operation === 'campus') {
      const programId = requiredUuid(body.program_id, 'program_id');
      const campus = requiredText(body.campus, 'campus', 80);
      const reason = requiredText(body.reason, 'reason', 1000);
      if (context.role !== 'admin' && (!context.isCampusHead || context.campus !== campus)) {
        throw new PilotHttpError(403, 'Campus purge requires the matching campus head or a super admin.', 'forbidden');
      }

      const { data: plan, error } = await context.callerClient.rpc('pilot_purge_campus', {
        p_program_id: programId,
        p_campus: campus,
        p_reason: reason,
      });
      if (error || !plan) throw error ?? new Error('Campus purge planning returned no result.');
      const status = String((plan as Record<string, unknown>).status ?? '');
      if (status === 'deleted' || status === 'already_deleted') return jsonResponse({ result: plan });
      if (status !== 'storage_cleanup_required' && status !== 'ready_for_finalisation') {
        throw new PilotHttpError(409, 'Campus Pilot data is not ready for purge.', 'purge_not_ready');
      }
      await removePilotStoragePaths(context.adminClient, storagePathsFromPlan(plan));
      const { data: result, error: finaliseError } = await context.adminClient.rpc('pilot_finalize_purge_campus', {
        p_program_id: programId,
        p_campus: campus,
        p_reason: reason,
        p_actor_id: context.user.id,
      });
      if (finaliseError || !result) throw finaliseError ?? new Error('Campus purge finalisation returned no result.');
      return jsonResponse({ result });
    }

    requireSuperAdmin(context);

    if (operation === 'program') {
      const programId = requiredUuid(body.program_id, 'program_id');
      const reason = requiredText(body.reason, 'reason', 1000);
      const { data: plan, error } = await context.callerClient.rpc('pilot_purge_program', {
        p_program_id: programId,
        p_reason: reason,
      });
      if (error || !plan) throw error ?? new Error('Programme purge planning returned no result.');
      const status = String((plan as Record<string, unknown>).status ?? '');
      if (status !== 'storage_cleanup_required' && status !== 'ready_for_finalisation') {
        if (status === 'already_deleted') return jsonResponse({ result: plan });
        throw new PilotHttpError(409, 'Pilot programme is not ready for purge.', 'purge_not_ready');
      }
      await removePilotStoragePaths(context.adminClient, storagePathsFromPlan(plan));
      const { data: result, error: finaliseError } = await context.adminClient.rpc('pilot_finalize_purge_program', {
        p_program_id: programId,
        p_reason: reason,
        p_actor_id: context.user.id,
      });
      if (finaliseError || !result) throw finaliseError ?? new Error('Programme purge finalisation returned no result.');
      return jsonResponse({ result });
    }

    const { data: plan, error } = await context.callerClient.rpc('pilot_purge_expired');
    if (error || !plan) throw error ?? new Error('Retention planning returned no result.');
    const sessionIds = Array.isArray((plan as Record<string, unknown>).session_ids)
      ? ((plan as Record<string, unknown>).session_ids as unknown[]).map((id) => requiredUuid(id, 'session_id'))
      : [];
    await removePilotStoragePaths(context.adminClient, storagePathsFromPlan(plan));
    const { data: result, error: finaliseError } = await context.adminClient.rpc('pilot_finalize_purge_expired', {
      p_session_ids: sessionIds,
      p_actor_id: context.user.id,
    });
    if (finaliseError || !result) throw finaliseError ?? new Error('Retention purge finalisation returned no result.');
    return jsonResponse({ result });
  } catch (error) {
    return handleError(error);
  }
});
