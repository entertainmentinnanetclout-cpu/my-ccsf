export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export class PilotHttpError extends Error {
  constructor(public status: number, message: string, public code = 'pilot_error') {
    super(message);
  }
}

export const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const value = await req.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('object required');
    return value as Record<string, unknown>;
  } catch {
    throw new PilotHttpError(400, 'A valid JSON object is required.', 'invalid_json');
  }
}

export function handleError(error: unknown): Response {
  if (error instanceof PilotHttpError) return jsonResponse({ error: error.message, code: error.code }, error.status);
  console.error('Pilot Edge Function error', error);
  const message = error instanceof Error ? error.message : 'Unexpected Pilot service error.';
  return jsonResponse({ error: message, code: 'internal_error' }, 500);
}

export function requirePost(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.', code: 'method_not_allowed' }, 405);
  return null;
}
