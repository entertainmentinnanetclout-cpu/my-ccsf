import { supabase } from '@/integrations/supabase/client';
import { evidenceChecksum, type EvidenceManifestItem } from '@/lib/evidenceProcessing';
import { uploadResumableEvidence } from '@/lib/resumableStorageUpload';
import type { CampusLocation } from '@/types/pilot';

export type EvidenceUploadStatus = 'queued' | 'uploading' | 'uploaded' | 'failed';
export interface EvidenceUploadState {
  status: EvidenceUploadStatus;
  progress: number;
  error?: string;
  resumed?: boolean;
}

export interface EvidenceSubmissionDraft {
  id: string;
  scope: 'official' | 'pilot';
  user_id: string;
  program_id: string | null;
  session_id: string | null;
  participant_id: string | null;
  scenario_id: string | null;
  campus: CampusLocation | null;
  payload: Record<string, unknown>;
  required_evidence: boolean;
  expires_at: string;
}

export interface SubmissionReceipt {
  id: string;
  scope: 'official' | 'pilot';
  reference_number: string;
  campus: CampusLocation | null;
  evidence_count: number;
  submitted_at: string;
  incident_id: string | null;
  pilot_report_id: string | null;
  payload: Record<string, unknown>;
}

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140) || 'evidence';
const fileKey = (file: File, index: number) => `${index}:${file.name}:${file.size}:${file.lastModified}`;

export async function createEvidenceSubmissionDraft(input: {
  scope: 'official' | 'pilot';
  payload: Record<string, unknown>;
  requiredEvidence?: boolean;
  programId?: string | null;
  sessionId?: string | null;
  participantId?: string | null;
  scenarioId?: string | null;
  campus?: CampusLocation | null;
}): Promise<EvidenceSubmissionDraft> {
  const { data, error } = await supabase.rpc('create_evidence_submission_draft' as never, {
    p_scope: input.scope,
    p_payload: input.payload,
    p_required_evidence: input.requiredEvidence ?? false,
    p_program_id: input.programId ?? null,
    p_session_id: input.sessionId ?? null,
    p_participant_id: input.participantId ?? null,
    p_scenario_id: input.scenarioId ?? null,
    p_campus: input.campus ?? null,
  } as never);
  if (error || !data) throw error ?? new Error('Unable to create a secure evidence submission.');
  return data as unknown as EvidenceSubmissionDraft;
}

export async function uploadSubmissionEvidence(input: {
  draft: EvidenceSubmissionDraft;
  files: File[];
  onState?: (key: string, state: EvidenceUploadState) => void;
  signal?: AbortSignal;
}): Promise<EvidenceManifestItem[]> {
  const manifest: EvidenceManifestItem[] = [];
  for (let index = 0; index < input.files.length; index += 1) {
    const file = input.files[index];
    const key = fileKey(file, index);
    const objectName = `${crypto.randomUUID()}-${safeName(file.name)}`;
    const path = input.draft.scope === 'official'
      ? `drafts/${input.draft.user_id}/${input.draft.id}/${objectName}`
      : `${input.draft.program_id}/${input.draft.campus}/${input.draft.user_id}/${input.draft.id}/${objectName}`;

    input.onState?.(key, { status: 'uploading', progress: 0 });
    try {
      const result = await uploadResumableEvidence({
        bucket: input.draft.scope === 'official' ? 'incident-media' : 'pilot-report-attachments',
        path,
        file,
        signal: input.signal,
        onProgress: (uploaded, total) => input.onState?.(key, {
          status: 'uploading',
          progress: total ? Math.round((uploaded / total) * 100) : 0,
        }),
      });
      const checksum = await evidenceChecksum(file);
      manifest.push({
        path,
        original_filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        checksum,
      });
      input.onState?.(key, { status: 'uploaded', progress: 100, resumed: result.resumed });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Evidence upload failed.';
      input.onState?.(key, { status: 'failed', progress: 0, error: message });
      throw error;
    }
  }
  return manifest;
}

export async function finalizeOfficialSubmission(input: {
  submissionId: string;
  evidence: EvidenceManifestItem[];
  submittedOffline?: boolean;
}): Promise<{ incident: { id: string }; receipt: SubmissionReceipt }> {
  const { data, error } = await supabase.rpc('finalize_official_evidence_submission' as never, {
    p_submission_id: input.submissionId,
    p_evidence: input.evidence,
    p_submitted_offline: input.submittedOffline ?? false,
  } as never);
  if (error || !data) throw error ?? new Error('The report could not be finalised.');
  return data as unknown as { incident: { id: string }; receipt: SubmissionReceipt };
}

export function evidenceUploadKey(file: File, index: number): string {
  return fileKey(file, index);
}
