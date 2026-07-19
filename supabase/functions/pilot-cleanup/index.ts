const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  return new Response(JSON.stringify({
    error: 'retired_endpoint',
    message: 'pilot-cleanup is not an operational CCSF endpoint.',
    replacement: 'Use report-by-report pilot-delete-report followed by the authorised campus, programme, or retention completion RPC.',
  }), { status: 410, headers });
});
