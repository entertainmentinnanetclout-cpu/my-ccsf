import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.87.1';
import { PilotHttpError } from './http.ts';

export type PilotRole = 'student' | 'security' | 'admin';

export interface PilotAuthContext {
  user: User;
  role: PilotRole;
  campus: string | null;
  isCampusHead: boolean;
  callerClient: SupabaseClient;
  adminClient: SupabaseClient;
}

export async function authenticatePilotRequest(req: Request): Promise<PilotAuthContext> {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new PilotHttpError(401, 'Authentication required.', 'unauthorized');

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) throw new PilotHttpError(500, 'Pilot service configuration is incomplete.', 'configuration_error');

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) throw new PilotHttpError(401, 'Invalid or expired authentication.', 'unauthorized');

  const [{ data: roleRows, error: roleError }, { data: profile, error: profileError }] = await Promise.all([
    adminClient.from('user_roles').select('role').eq('user_id', user.id),
    adminClient.from('profiles').select('campus').eq('id', user.id).maybeSingle(),
  ]);
  if (roleError || profileError) throw new PilotHttpError(500, 'Unable to verify Pilot permissions.', 'permission_lookup_failed');

  const roles = new Set((roleRows ?? []).map((row) => String(row.role)));
  const role: PilotRole | null = roles.has('admin') ? 'admin' : roles.has('security') ? 'security' : roles.has('student') ? 'student' : null;
  if (!role) throw new PilotHttpError(403, 'A recognised Pilot role is required.', 'forbidden');

  let isCampusHead = false;
  if (role === 'security') {
    const { data: accessRows, error: accessError } = await adminClient
      .from('admin_access')
      .select('campus,is_head')
      .eq('admin_id', user.id)
      .eq('is_head', true);
    if (accessError) throw new PilotHttpError(500, 'Unable to verify campus-head authority.', 'permission_lookup_failed');
    isCampusHead = (accessRows ?? []).some((row) => row.campus === profile?.campus);
  }

  return { user, role, campus: profile?.campus ?? null, isCampusHead, callerClient, adminClient };
}

export function requireStudent(context: PilotAuthContext): void {
  if (context.role !== 'student') throw new PilotHttpError(403, 'Student Pilot access required.', 'forbidden');
}

export function requireStaff(context: PilotAuthContext): void {
  if (context.role !== 'security' && context.role !== 'admin') throw new PilotHttpError(403, 'Pilot staff access required.', 'forbidden');
}

export function requireSuperAdmin(context: PilotAuthContext): void {
  if (context.role !== 'admin') throw new PilotHttpError(403, 'Super-admin Pilot access required.', 'forbidden');
}

export function requireCampusScope(context: PilotAuthContext, campus: string): void {
  if (context.role === 'admin') return;
  if (context.role !== 'security' || !context.campus || context.campus !== campus) {
    throw new PilotHttpError(403, 'The Pilot record is outside your campus scope.', 'campus_scope_denied');
  }
}
