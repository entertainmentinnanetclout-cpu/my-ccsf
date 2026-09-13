import { corsPreflight, jsonResponse, rejectUnapprovedBrowserOrigin } from '../_shared/cors.ts';

Deno.serve((req) => {
  const preflight = corsPreflight(req); if (preflight) return preflight;
  const originRejection = rejectUnapprovedBrowserOrigin(req); if (originRejection) return originRejection;
  return jsonResponse(req, {
    error: 'retired_endpoint',
    message: 'pilot-export-results is not an operational CCSF endpoint.',
    replacement: 'Use the audited pilot_export_data RPC.',
  }, 410);
});
