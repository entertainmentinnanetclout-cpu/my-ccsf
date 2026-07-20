import { authenticatePilotRequest, requireCampusScope, requireStaff } from '../_shared/pilot/auth.ts';
import { handleError, jsonResponse, readJson, requirePost, PilotHttpError } from '../_shared/pilot/http.ts';
import { enumValue, optionalText, optionalUuid, requiredUuid } from '../_shared/pilot/validation.ts';
import { writePilotAudit } from '../_shared/pilot/audit.ts';

const STATUSES = ['received','assessing','assigned','in_progress','simulation_completed','cancelled','withdrawn','expired'] as const;

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
    if (!report || report.deleted_at) throw new PilotHttpError(404, 'Pilot report not found.', 'report_not_found');
    if (report.routing_destination !== 'campus_security' || report.routing_campus !== report.campus) {
      throw new PilotHttpError(409, 'Pilot report routing is invalid.', 'routing_invalid');
    }
    requireCampusScope(context, report.routing_campus);

    const { data: program, error: programError } = await context.adminClient
      .from('pilot_programs')
      .select('status, starts_at, ends_at, eligible_campuses')
      .eq('id', report.program_id)
      .maybeSingle();
    if (programError) throw programError;
    if (!program || !isProgrammeOpen(program, report.routing_campus)) {
      throw new PilotHttpError(409, 'The Pilot programme is not active for this campus.', 'programme_inactive');
    }

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
      if (context.role !== 'admin' && assigneeProfile?.campus !== report.routing_campus) {
        throw new PilotHttpError(403, 'The assigned officer must belong to the routed report campus.', 'assignee_campus_mismatch');
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
      metadata: {
        from_status: report.status,
        to_status: status,
        edge_function: 'pilot-transition-status',
        simulation_only: true,
        routing_destination: report.routing_destination,
        routing_campus: report.routing_campus,
        external_dispatch: false,
      },
    });

    return jsonResponse({ report: data });
  } catch (error) {
    return handleError(error);
  }
});