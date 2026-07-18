import { authenticatePilotRequest, requireCampusScope, requireStaff } from '../_shared/pilot/auth.ts';
import { handleError, jsonResponse, readJson, requirePost, PilotHttpError } from '../_shared/pilot/http.ts';
import { enumValue, requiredText, requiredUuid } from '../_shared/pilot/validation.ts';
import { writePilotAudit } from '../_shared/pilot/audit.ts';

const TYPES = ['report_received','status_changed','assigned','simulation_completed','action_required','session_expiring','programme_message'] as const;

Deno.serve(async (req) => {
  const early = requirePost(req);
  if (early) return early;

  try {
    const context = await authenticatePilotRequest(req);
    requireStaff(context);
    const body = await readJson(req);
    const reportId = requiredUuid(body.report_id, 'report_id');
    const type = enumValue(body.type, 'type', TYPES);
    const title = requiredText(body.title, 'title', 160);
    const message = requiredText(body.message, 'message', 2000);

    const { data: report, error: reportError } = await context.adminClient
      .from('pilot_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();
    if (reportError) throw reportError;
    if (!report) throw new PilotHttpError(404, 'Pilot report not found.', 'report_not_found');
    requireCampusScope(context, report.campus);

    const { data, error } = await context.callerClient.rpc('pilot_create_notification', {
      p_report_id: reportId,
      p_type: type,
      p_title: title,
      p_message: message,
    });
    if (error || !data) throw error ?? new Error('Notification creation returned no record.');

    await writePilotAudit(context.adminClient, {
      programId: report.program_id,
      actorId: context.user.id,
      actorRole: context.role,
      actorCampus: context.campus,
      action: 'notification_created',
      entityType: 'pilot_notification',
      entityId: data.id,
      metadata: { report_id: report.id, notification_type: type, edge_function: 'pilot-create-notification' },
    });

    return jsonResponse({ notification: data }, 201);
  } catch (error) {
    return handleError(error);
  }
});
