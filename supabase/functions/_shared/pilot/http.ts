import {
  corsPreflight,
  jsonResponse as institutionalJsonResponse,
  rejectUnapprovedBrowserOrigin,
} from '../cors.ts';

export class PilotHttpError extends Error {
  constructor(public status: number, message: string, public code = 'pilot_error') {
    super(message);
  }
}

export const jsonResponse = (req: Request, body: unknown, status = 200) =>
  institutionalJsonResponse(req, body, status);

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const value = await req.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('object required');
    return value as Record<string, unknown>;
  } catch {
    throw new PilotHttpError(400, 'A valid JSON object is required.', 'invalid_json');
  }
}

export function handleError(req: Request, error: unknown): Response {
  if (error instanceof PilotHttpError) return jsonResponse(req, { error: error.message, code: error.code }, error.status);
  console.error('Pilot Edge Function error', error);
  const message = error instanceof Error ? error.message : 'Unexpected Pilot service error.';
  return jsonResponse(req, { error: message, code: 'internal_error' }, 500);
}

export function requirePost(req: Request): Response | null {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  const originRejection = rejectUnapprovedBrowserOrigin(req);
  if (originRejection) return originRejection;
  if (req.method !== 'POST') return jsonResponse(req, { error: 'Method not allowed.', code: 'method_not_allowed' }, 405);
  return null;
}
