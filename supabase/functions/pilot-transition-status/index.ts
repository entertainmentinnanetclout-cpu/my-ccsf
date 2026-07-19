import { authenticatePilotRequest, requireCampusScope, requireStaff } from '../_shared/pilot/auth.ts';
import { handleError, jsonResponse, readJson, requirePost, PilotHttpError } from '../_shared/pilot/http.ts';
import { enumValue, optionalText, optionalUuid, requiredUuid } from '../_shared/pilot/validation.ts';
import { writePilotAudit } from '../_shared/pilot/audit.ts';

const STATUSES = ['received','assessing','assigned','in_progress','simulation_completed','cancelled','withdrawn','expired'] as const;

Deno.serve(async (req) => {
  const early = requirePost(req);
  if (early) return early;

  try {
    const context = await authenticatePilotRequest(req);
    requireStaff(context);
    const body = await readJson(req);
    const reportId = requiredUuid(body.report_id, 'report_id');
    const status = enumValue(body.status, 'status', STATUSES);
    const notes = optionalText(body.notes, 'notes', 2000);
    const assignedTo = optionalUuid(body.assigned_to, 'assigned_to');

    const { data: report, error: reportError } = await context.adminClient
      .from('pilot_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();
    if (reportError) throw reportError;
    if (!report) throw new PilotHttpError(404, 'Pilot report not found.', 'report_not_found');
    requireCampusScope(context, report.campus);

    if (status === 'assigned' && !assignedTo) {
      throw new PilotHttpError(400, 'assigned_to is required for the Assigned status.', 'assignment_required');
    }
    if (assignedTo) {
      const { data: assigneeRoles, error: assigneeError } = await context.adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', assignedTo);
      if (assigneeError) throw assigneeError;
      if (!(assigneeRoles ?? []).some((row) => row.role === 'security' || row.role === 'admin')) {
        throw new PilotHttpError(400, 'The assigned user is not authorised Pilot staff.', 'invalid_assignee');
      }
      const { data: assigneeProfile } = await context.adminClient.from('profiles').select('campus').eq('id', assignedTo).maybeSingle();
      if (context.role !== 'admin' && assigneeProfile?.campus !== report.campus) {
        throw new PilotHttpError(403, 'The assigned officer must belong to the report campus.', 'assignee_campus_mismatch');
      }
    }

    const { data, error } = await context.callerClient.rpc('pilot_transition_report', {
      p_report_id: reportId,
      p_to_status: status,
      p_notes: notes ?? undefined,
      p_assigned_to: assignedTo ?? undefined,
    });
    if (error || !data) throw error ?? new Error('Status transition returned no record.');

    await writePilotAudit(context.adminClient, {
      programId: report.program_id,
      actorId: context.user.id,
      actorRole: context.role,
      actorCampus: context.campus,
      action: 'status_transitioned',
      entityType: 'pilot_report',
      entityId: report.id,
      metadata: { from_status: report.status, to_status: status, edge_function: 'pilot-transition-status' },
    });

    return jsonResponse({ report: data });
  } catch (error) {
    return handleError(error);
  }
});
