import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const started = Date.now();
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required.' }, 401);
    const url = Deno.env.get('SUPABASE_URL'), anonKey = Deno.env.get('SUPABASE_ANON_KEY'), serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) throw new Error('Evidence access service is not configured.');
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: userError } = await caller.auth.getUser();
    if (userError || !user) return json({ error: 'Invalid or expired authentication.' }, 401);
    const { data: accessAllowed, error: accessError } = await caller.rpc('current_app_access_allowed');
    if (accessError || accessAllowed !== true) return json({ error: 'CCSF access has been restricted by the developer control plane.', code: 'developer_access_denied' }, 403);
    const { data: evidenceEnabled } = await admin.rpc('effective_feature_enabled', { p_feature_key: 'evidence', p_user_id: user.id });
    if (evidenceEnabled !== true) return json({ error: 'Evidence access is disabled by the developer control plane.', code: 'feature_disabled' }, 409);

    const body = await req.json() as Record<string, unknown>;
    const scope = body.scope === 'official' || body.scope === 'pilot' ? body.scope : null;
    const action = body.action === 'download' ? 'download' : body.action === 'preview' ? 'preview' : null;
    const objectPath = typeof body.object_path === 'string' ? body.object_path.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : null;
    const incidentId = typeof body.incident_id === 'string' && UUID.test(body.incident_id) ? body.incident_id : null;
    const pilotReportId = typeof body.pilot_report_id === 'string' && UUID.test(body.pilot_report_id) ? body.pilot_report_id : null;
    if (!scope || !action || !objectPath) return json({ error: 'A valid evidence scope, action and object path are required.' }, 400);
    if (action === 'download' && !reason) return json({ error: 'A reason is required before private evidence is downloaded.' }, 400);

    const [{ data: roles, error: roleError }, { data: profile, error: profileError }] = await Promise.all([
      admin.from('user_roles').select('role').eq('user_id', user.id), admin.from('profiles').select('campus').eq('id', user.id).maybeSingle(),
    ]);
    if (roleError || profileError) throw roleError ?? profileError;
    const roleSet = new Set((roles ?? []).map((row) => String(row.role)));
    const role = roleSet.has('admin') ? 'admin' : roleSet.has('security') ? 'security' : roleSet.has('student') ? 'student' : null;
    if (!role) return json({ error: 'An authorised CCSF role is required.' }, 403);
    const campus = profile?.campus ?? null;
    let bucket = '', authorised = false, recordCampus: string | null = null;

    if (scope === 'official') {
      if (!incidentId) return json({ error: 'An official incident is required.' }, 400);
      const [{ data: incident, error: incidentError }, { data: media, error: mediaError }] = await Promise.all([
        admin.from('incidents').select('id,submitted_by,reporter_id,assigned_to,campus').eq('id', incidentId).maybeSingle(),
        admin.from('incident_media').select('id,media_url').eq('incident_id', incidentId).eq('media_url', objectPath).maybeSingle(),
      ]);
      if (incidentError || mediaError) throw incidentError ?? mediaError;
      if (!incident || !media) return json({ error: 'The requested evidence record was not found.' }, 404);
      recordCampus = incident.campus;
      authorised = incident.submitted_by === user.id || incident.reporter_id === user.id || incident.assigned_to === user.id || role === 'admin' || (role === 'security' && Boolean(campus) && campus === incident.campus);
      bucket = 'incident-media';
    } else {
      if (!pilotReportId) return json({ error: 'A Pilot report is required.' }, 400);
      const [{ data: report, error: reportError }, { data: attachment, error: attachmentError }] = await Promise.all([
        admin.from('pilot_reports').select('id,submitted_by,campus').eq('id', pilotReportId).maybeSingle(),
        admin.from('pilot_attachments').select('id,storage_path').eq('report_id', pilotReportId).eq('storage_path', objectPath).maybeSingle(),
      ]);
      if (reportError || attachmentError) throw reportError ?? attachmentError;
      if (!report || !attachment) return json({ error: 'The requested Pilot evidence record was not found.' }, 404);
      recordCampus = report.campus;
      authorised = report.submitted_by === user.id || role === 'admin' || (role === 'security' && Boolean(campus) && campus === report.campus);
      bucket = 'pilot-report-attachments';
    }
    if (!authorised) return json({ error: 'This evidence is outside your authorised scope.' }, 403);

    const expiresIn = action === 'download' ? 120 : 300;
    const { data: signed, error: signedError } = await admin.storage.from(bucket).createSignedUrl(objectPath, expiresIn, { download: action === 'download' });
    if (signedError || !signed?.signedUrl) throw signedError ?? new Error('A private evidence link could not be created.');
    const { error: auditError } = await admin.from('evidence_access_audit').insert({ scope, bucket_id: bucket, object_path: objectPath, incident_id: incidentId, pilot_report_id: pilotReportId, actor_id: user.id, actor_role: role, actor_campus: campus, action, reason, metadata: { expires_in_seconds: expiresIn, record_campus: recordCampus, user_agent: req.headers.get('user-agent') } });
    if (auditError) throw auditError;
    await admin.from('runtime_events').insert({ user_id: user.id, edge_function: 'secure-evidence-link', event_type: 'edge_invocation', severity: 'info', duration_ms: Date.now() - started, metadata: { scope, action } });
    return json({ signed_url: signed.signedUrl, expires_in: expiresIn });
  } catch (error) {
    console.error('Secure evidence access failed', error);
    return json({ error: error instanceof Error ? error.message : 'Private evidence could not be opened.' }, 500);
  }
});
