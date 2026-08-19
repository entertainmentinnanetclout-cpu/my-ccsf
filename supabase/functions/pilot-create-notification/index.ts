import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

Deno.serve(async (req) => {
  const started = Date.now();
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405);
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return respond({ error: 'Authentication required.' }, 401);
    const body = await req.json();
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) return respond({ error: 'Service configuration missing.' }, 500);

    const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) return respond({ error: 'Invalid authentication.' }, 401);
    const { data: allowed, error: accessError } = await client.rpc('current_app_access_allowed');
    if (accessError || allowed !== true) return respond({ error: 'CCSF access has been restricted by the developer control plane.', code: 'developer_access_denied' }, 403);
    const { data: notificationsEnabled } = await admin.rpc('effective_feature_enabled', { p_feature_key: 'notifications', p_user_id: user.id });
    if (notificationsEnabled !== true) return respond({ error: 'Notifications are disabled by the developer control plane.', code: 'feature_disabled' }, 409);

    const { data, error } = await client.rpc('pilot_staff_message', {
      p_report_id: body.report_id,
      p_kind: body.kind,
      p_title: body.title,
      p_content: body.content,
    });
    if (error) throw error;
    await admin.from('runtime_events').insert({ user_id: user.id, edge_function: 'pilot-create-notification', event_type: 'edge_invocation', severity: 'info', duration_ms: Date.now() - started, metadata: { report_id: body.report_id } });
    return respond({ result: data }, 201);
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : 'Pilot request failed.' }, 500);
  }
});
