import { supabase } from '@/integrations/supabase/client';
import {
  PILOT_ATTACHMENT_BUCKET,
  PILOT_MAX_ATTACHMENTS,
  PILOT_MAX_FILE_BYTES,
  PILOT_ALLOWED_MIME_TYPES,
} from '@/config/pilot';
import { isAllowedEvidenceFile, normaliseEvidenceMimeType } from '@/lib/evidenceFiles';
import type { PilotAttachment, PilotReport } from '@/types/pilot';

export function validatePilotEvidence(files: File[]): void {
  if (files.length > PILOT_MAX_ATTACHMENTS) throw new Error(`A maximum of ${PILOT_MAX_ATTACHMENTS} files is allowed.`);
  for (const file of files) {
    if (file.size <= 0 || file.size > PILOT_MAX_FILE_BYTES) throw new Error(`${file.name} exceeds the 10 MB Pilot limit.`);
    if (!isAllowedEvidenceFile(file, PILOT_ALLOWED_MIME_TYPES)) throw new Error(`${file.name} has an unsupported file type.`);
  }
}

async function uploadObjectWithRetry(path: string, file: File): Promise<void> {
  const mimeType = normaliseEvidenceMimeType(file);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { error } = await supabase.storage.from(PILOT_ATTACHMENT_BUCKET).upload(path, file, {
      cacheControl: '3600',
      contentType: mimeType,
      upsert: false,
    });
    if (!error) return;
    if (attempt === 0) await supabase.auth.refreshSession().catch(() => undefined);
    else throw error;
  }
}

export async function uploadPilotEvidenceResilient(
  report: PilotReport,
  files: File[],
  userId: string,
  onProgress?: (percentage: number) => void,
): Promise<PilotAttachment[]> {
  validatePilotEvidence(files);
  const uploaded: PilotAttachment[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const mimeType = normaliseEvidenceMimeType(file);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${report.program_id}/${report.campus}/${userId}/${report.id}/${crypto.randomUUID()}-${safeName}`;

    await uploadObjectWithRetry(storagePath, file);

    const { data, error } = await supabase.from('pilot_attachments').insert({
      program_id: report.program_id,
      session_id: report.session_id,
      report_id: report.id,
      uploaded_by: userId,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: mimeType,
      size_bytes: file.size,
    }).select('*').single();

    if (error || !data) {
      await supabase.storage.from(PILOT_ATTACHMENT_BUCKET).remove([storagePath]);
      throw error ?? new Error('The evidence file uploaded, but its secure metadata could not be recorded.');
    }

    uploaded.push(data as PilotAttachment);
    onProgress?.(((index + 1) / files.length) * 100);
  }

  return uploaded;
}
