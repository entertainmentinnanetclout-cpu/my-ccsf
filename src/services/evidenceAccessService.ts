import { supabase } from '@/integrations/supabase/client';

export async function createAuditedEvidenceLink(input: {
  scope: 'official' | 'pilot';
  objectPath: string;
  action: 'preview' | 'download';
  incidentId?: string | null;
  pilotReportId?: string | null;
  reason?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke('secure-evidence-link', {
    body: {
      scope: input.scope,
      object_path: input.objectPath,
      action: input.action,
      incident_id: input.incidentId ?? null,
      pilot_report_id: input.pilotReportId ?? null,
      reason: input.reason ?? null,
    },
  });
  if (error) {
    let message = error.message || 'Private evidence could not be opened.';
    const context = (error as { context?: Response }).context;
    if (context instanceof Response) {
      try {
        const payload = await context.clone().json() as { error?: string };
        if (payload.error) message = payload.error;
      } catch { /* Retain the client error. */ }
    }
    throw new Error(message);
  }
  const signedUrl = (data as { signed_url?: string } | null)?.signed_url;
  if (!signedUrl) throw new Error('Private evidence access returned no link.');
  return signedUrl;
}
