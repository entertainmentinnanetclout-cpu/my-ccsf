import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

export async function writePilotAudit(adminClient: SupabaseClient, input: {
  programId?: string | null;
  actorId: string;
  actorRole: 'student' | 'security' | 'admin';
  actorCampus?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  affectedCount?: number;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await adminClient.from('pilot_audit_logs').insert({
    program_id: input.programId ?? null,
    actor_id: input.actorId,
    actor_role: input.actorRole,
    actor_campus: input.actorCampus ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    affected_count: input.affectedCount ?? 1,
    reason: input.reason ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) console.error('Pilot audit insert failed', error);
}
