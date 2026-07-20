import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';
import { PilotHttpError } from './http.ts';

interface PilotProgramRow {
  id: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  eligible_campuses: string[] | null;
}

interface PilotParticipantRow {
  id: string;
  program_id: string;
  user_id: string;
  campus: string;
  status: string;
  invited_by: string;
}

export async function findActivePilotProgram(adminClient: SupabaseClient, campus: string): Promise<PilotProgramRow> {
  const { data, error } = await adminClient
    .from('pilot_programs')
    .select('id,status,starts_at,ends_at,eligible_campuses')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const now = Date.now();
  const program = (data ?? []).find((item) => {
    const row = item as PilotProgramRow;
    const started = !row.starts_at || new Date(row.starts_at).getTime() <= now;
    const notEnded = !row.ends_at || new Date(row.ends_at).getTime() >= now;
    return started && notEnded && Array.isArray(row.eligible_campuses) && row.eligible_campuses.includes(campus);
  }) as PilotProgramRow | undefined;

  if (!program) {
    throw new PilotHttpError(409, 'No active Pilot programme is accepting students from your campus.', 'programme_unavailable');
  }

  return program;
}

export async function ensurePilotParticipant(
  adminClient: SupabaseClient,
  userId: string,
  campus: string,
): Promise<{ program: PilotProgramRow; participant: PilotParticipantRow; created: boolean }> {
  const program = await findActivePilotProgram(adminClient, campus);
  const { data: existing, error: existingError } = await adminClient
    .from('pilot_participants')
    .select('*')
    .eq('program_id', program.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    const participant = existing as PilotParticipantRow;
    if (participant.status === 'withdrawn') {
      throw new PilotHttpError(409, 'This account previously withdrew from the active Pilot. Contact CCSF Pilot support to rejoin.', 'participant_withdrawn');
    }
    if (participant.campus !== campus) {
      throw new PilotHttpError(409, 'Your Pilot campus does not match your current student profile.', 'campus_mismatch');
    }
    return { program, participant, created: false };
  }

  const { data: participant, error: participantError } = await adminClient
    .from('pilot_participants')
    .insert({
      program_id: program.id,
      user_id: userId,
      campus,
      status: 'invited',
      invited_by: userId,
    })
    .select('*')
    .single();

  if (participantError || !participant) {
    throw participantError ?? new Error('Pilot enrolment returned no participant record.');
  }

  return { program, participant: participant as PilotParticipantRow, created: true };
}
