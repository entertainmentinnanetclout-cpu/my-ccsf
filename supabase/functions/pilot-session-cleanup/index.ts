import { corsPreflight, jsonResponse, rejectUnapprovedBrowserOrigin } from '../_shared/cors.ts';

Deno.serve((req) => {
  const preflight = corsPreflight(req); if (preflight) return preflight;
  const originRejection = rejectUnapprovedBrowserOrigin(req); if (originRejection) return originRejection;
  return jsonResponse(req, {
    error: 'retired_endpoint',
    message: 'pilot-session-cleanup is not an operational CCSF endpoint.',
    replacement: 'Use report-by-report pilot-delete-report followed by the authorised session completion RPC.',
  }, 410);
});
