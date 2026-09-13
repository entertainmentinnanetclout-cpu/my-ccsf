const PRIMARY_ORIGIN = 'https://my-ccsf.vercel.app';

const builtInOrigins = new Set([
  PRIMARY_ORIGIN,
  'https://mycampussafetyapptut.vercel.app',
  'http://localhost:5173',
  'http://localhost:8080',
]);

function configuredOrigins(): Set<string> {
  const configured = (Deno.env.get('APP_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...builtInOrigins, ...configured]);
}

export function originAllowed(origin: string | null): boolean {
  if (!origin) return true; // server-to-server / scheduled invocation
  if (configuredOrigins().has(origin)) return true;

  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') return false;
    return /^(?:my-ccsf|mycampussafetyapptut)-[a-z0-9-]+\.vercel\.app$/i.test(url.hostname);
  } catch {
    return false;
  }
}

export function corsHeadersFor(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && originAllowed(origin) ? origin : PRIMARY_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
  };
}

export function rejectUnapprovedBrowserOrigin(req: Request): Response | null {
  const origin = req.headers.get('origin');
  if (origin && !originAllowed(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed', code: 'origin_not_allowed' }), {
      status: 403,
      headers: {
        ...corsHeadersFor(null),
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
  return null;
}

export function corsPreflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;
  const rejection = rejectUnapprovedBrowserOrigin(req);
  if (rejection) return rejection;
  return new Response(null, { status: 204, headers: corsHeadersFor(req.headers.get('origin')) });
}

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersFor(req.headers.get('origin')),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
