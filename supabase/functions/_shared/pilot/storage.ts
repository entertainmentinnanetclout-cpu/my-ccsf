import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';
import { PilotHttpError } from './http.ts';

export const PILOT_ATTACHMENT_BUCKET = 'pilot-report-attachments';

export async function removePilotStoragePaths(adminClient: SupabaseClient, paths: string[]): Promise<number> {
  const unique = [...new Set(paths.filter((path) => typeof path === 'string' && path.length > 0))];
  for (const path of unique) {
    if (path.includes('..') || path.startsWith('/') || path.length > 1024) {
      throw new PilotHttpError(400, 'The Pilot deletion plan contains an invalid Storage path.', 'invalid_storage_path');
    }
  }

  for (let index = 0; index < unique.length; index += 100) {
    const chunk = unique.slice(index, index + 100);
    const { error } = await adminClient.storage.from(PILOT_ATTACHMENT_BUCKET).remove(chunk);
    if (error) throw new PilotHttpError(500, 'Private Pilot attachment cleanup failed.', 'storage_cleanup_failed');
  }

  return unique.length;
}

export function storagePathsFromPlan(plan: unknown): string[] {
  if (!plan || typeof plan !== 'object') return [];
  const value = (plan as { storage_paths?: unknown }).storage_paths;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
