import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { CampusLocation } from '@/types/pilot';

export interface PilotStudentIdentity {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone_number: string | null;
  campus: CampusLocation | null;
  student_number: string | null;
  course: string | null;
  year_of_study: number | null;
  residence: Database['public']['Enums']['residence_name'] | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
}

const PROFILE_FIELDS = [
  'id',
  'full_name',
  'first_name',
  'last_name',
  'email',
  'phone_number',
  'campus',
  'student_number',
  'course',
  'year_of_study',
  'residence',
  'emergency_contact_name',
  'emergency_contact_phone',
  'emergency_contact_relationship',
].join(',');

export async function loadPilotStudentIdentities(userIds: string[]): Promise<PilotStudentIdentity[]> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .in('id', uniqueIds);

  if (error) {
    console.error('Unable to load Pilot student identities.', error);
    throw new Error('Student names and profile details could not be loaded.');
  }

  return (data ?? []) as unknown as PilotStudentIdentity[];
}

export async function loadPilotStudentIdentity(userId: string): Promise<PilotStudentIdentity | null> {
  const identities = await loadPilotStudentIdentities([userId]);
  return identities[0] ?? null;
}

export function getPilotStudentName(identity: PilotStudentIdentity | null | undefined, userId?: string): string {
  const fullName = identity?.full_name?.trim();
  if (fullName) return fullName;

  const combinedName = [identity?.first_name, identity?.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ')
    .trim();
  if (combinedName) return combinedName;

  if (identity?.student_number) return `Student ${identity.student_number}`;
  return userId ? `Student ${userId.slice(0, 8)}` : 'Student';
}
