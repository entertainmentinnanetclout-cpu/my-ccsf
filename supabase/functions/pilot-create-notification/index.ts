import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405);

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return respond({ error: 'Authentication required.' }, 401);
    const body = await req.json();
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !key) return respond({ error: 'Service configuration missing.' }, 500);

    const client = createClient(url, key, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return respond({ error: 'Invalid authentication.' }, 401);

    const { data, error } = await client.rpc('pilot_staff_message', {
      p_report_id: body.report_id,
      p_kind: body.kind,
      p_title: body.title,
      p_content: body.content,
    });
    if (error) throw error;
    return respond({ result: data }, 201);
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : 'Pilot request failed.' }, 500);
  }
});
