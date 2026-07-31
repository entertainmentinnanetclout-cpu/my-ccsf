import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required.' }, 401);
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) throw new Error('Evidence cleanup is not configured.');

    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: userError } = await caller.auth.getUser();
    if (userError || !user) return json({ error: 'Invalid or expired authentication.' }, 401);

    const { data: roles, error: roleError } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    if (roleError) throw roleError;
    if (!(roles ?? []).some((row) => row.role === 'admin')) return json({ error: 'Super-admin authority is required.' }, 403);

    const { data: drafts, error: draftError } = await admin
      .from('evidence_submission_drafts')
      .select('id,scope,user_id,program_id,campus,status,expires_at')
      .lt('expires_at', new Date().toISOString())
      .in('status', ['draft', 'uploading', 'ready'])
      .limit(500);
    if (draftError) throw draftError;

    let removedObjects = 0;
    const failedDrafts: Array<{ id: string; error: string }> = [];

    for (const draft of drafts ?? []) {
      try {
        const bucket = draft.scope === 'official' ? 'incident-media' : 'pilot-report-attachments';
        const prefix = draft.scope === 'official'
          ? `drafts/${draft.user_id}/${draft.id}`
          : `${draft.program_id}/${draft.campus}/${draft.user_id}/${draft.id}`;
        const { data: objects, error: listError } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
        if (listError) throw listError;
        const paths = (objects ?? []).filter((item) => item.name && item.id).map((item) => `${prefix}/${item.name}`);
        if (paths.length) {
          const { error: removeError } = await admin.storage.from(bucket).remove(paths);
          if (removeError) throw removeError;
          removedObjects += paths.length;
        }
        const { error: updateError } = await admin.from('evidence_submission_drafts').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', draft.id);
        if (updateError) throw updateError;
      } catch (error) {
        failedDrafts.push({ id: draft.id, error: error instanceof Error ? error.message : 'Cleanup failed.' });
      }
    }

    await admin.from('evidence_access_audit').insert({
      scope: 'official',
      bucket_id: 'system',
      object_path: 'expired-evidence-submission-cleanup',
      actor_id: user.id,
      actor_role: 'admin',
      actor_campus: null,
      action: 'preview',
      reason: 'Scheduled privacy cleanup of expired local/server evidence drafts',
      metadata: { expired_drafts: (drafts ?? []).length, removed_objects: removedObjects, failures: failedDrafts.length },
    }).catch(() => undefined);

    return json({ processed: (drafts ?? []).length, removed_objects: removedObjects, failures: failedDrafts });
  } catch (error) {
    console.error('Evidence submission cleanup failed', error);
    return json({ error: error instanceof Error ? error.message : 'Evidence cleanup failed.' }, 500);
  }
});
