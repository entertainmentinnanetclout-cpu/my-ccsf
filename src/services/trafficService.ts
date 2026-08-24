import { supabase } from '@/integrations/supabase/client';
import type {
  TrafficCampus,
  TrafficPassStatus,
  TrafficPermitKind,
  TrafficPermitTemplate,
  TrafficRoadSafetyNotice,
  TrafficStudentPermit,
  TrafficStudentPermitStatus,
  TrafficTemplateStatus,
  TrafficVisitorPass,
  VisitorParkingRequest,
  VisitorPassReceipt,
  VisitorPassTracking,
} from '@/types/traffic';
import {
  TRAFFIC_MAX_TEMPLATE_BYTES,
  TRAFFIC_TEMPLATE_BUCKET,
  TRAFFIC_TEMPLATE_MIME_TYPES,
} from '@/types/traffic';

const VISITOR_PASS_COLUMNS = [
  'id',
  'reference_code',
  'visitor_name',
  'visitor_email',
  'visitor_phone',
  'vehicle_registration',
  'vehicle_make',
  'vehicle_colour',
  'campus',
  'host_name',
  'host_department',
  'visit_purpose',
  'visit_date',
  'expected_arrival',
  'status',
  'decision_notes',
  'approved_by',
  'approved_at',
  'checked_in_at',
  'checked_out_at',
  'created_at',
  'updated_at',
].join(',');

export async function createVisitorParkingRequest(
  input: VisitorParkingRequest,
): Promise<VisitorPassReceipt> {
  const { data, error } = await supabase.rpc('traffic_create_visitor_pass', {
    p_visitor_name: input.visitorName,
    p_visitor_email: input.visitorEmail,
    p_visitor_phone: input.visitorPhone,
    p_vehicle_registration: input.vehicleRegistration,
    p_vehicle_make: input.vehicleMake,
    p_vehicle_colour: input.vehicleColour,
    p_campus: input.campus,
    p_host_name: input.hostName,
    p_host_department: input.hostDepartment,
    p_visit_purpose: input.visitPurpose,
    p_visit_date: input.visitDate,
    p_expected_arrival: input.expectedArrival,
  });
  if (error) throw error;

  const receipt = data?.[0];
  if (!receipt) throw new Error('The Traffic request was not created.');

  return {
    passId: receipt.pass_id,
    referenceCode: receipt.reference_code,
    trackingToken: receipt.tracking_token,
    passStatus: receipt.pass_status,
    submittedAt: receipt.submitted_at,
  };
}

export async function trackVisitorParkingRequest(
  referenceCode: string,
  trackingToken: string,
): Promise<VisitorPassTracking | null> {
  const { data, error } = await supabase.rpc('traffic_track_visitor_pass', {
    p_reference_code: referenceCode,
    p_tracking_token: trackingToken,
  });
  if (error) throw error;

  const pass = data?.[0];
  if (!pass) return null;
  return {
    passId: pass.pass_id,
    referenceCode: pass.reference_code,
    visitorName: pass.visitor_name,
    vehicleRegistration: pass.vehicle_registration,
    campus: pass.campus,
    visitDate: pass.visit_date,
    expectedArrival: pass.expected_arrival,
    passStatus: pass.pass_status,
    decisionNotes: pass.decision_notes,
    approvedAt: pass.approved_at,
    checkedInAt: pass.checked_in_at,
    checkedOutAt: pass.checked_out_at,
    submittedAt: pass.submitted_at,
  };
}

export async function listTrafficRoadSafetyNotices(
  campus?: TrafficCampus,
): Promise<TrafficRoadSafetyNotice[]> {
  let query = supabase
    .from('traffic_road_safety_notices')
    .select('*')
    .eq('is_published', true)
    .lte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: false });

  if (campus) query = query.or('campus.is.null,campus.eq.' + campus);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getStudentTrafficPermit(
  studentId: string,
): Promise<TrafficStudentPermit | null> {
  const { data, error } = await supabase
    .from('traffic_student_permits')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function requestStudentTrafficPermit(input: {
  campus: TrafficCampus;
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleColour: string;
}): Promise<TrafficStudentPermit> {
  const { data, error } = await supabase.rpc('traffic_request_student_permit', {
    p_campus: input.campus,
    p_vehicle_registration: input.vehicleRegistration,
    p_vehicle_make: input.vehicleMake,
    p_vehicle_colour: input.vehicleColour,
  });
  if (error) throw error;
  return data;
}

export async function listTrafficVisitorPasses(
  campus?: TrafficCampus,
): Promise<TrafficVisitorPass[]> {
  let query = supabase
    .from('traffic_visitor_passes')
    .select(VISITOR_PASS_COLUMNS)
    .order('visit_date', { ascending: true })
    .order('expected_arrival', { ascending: true })
    .limit(250);

  if (campus) query = query.eq('campus', campus);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as TrafficVisitorPass[];
}

export async function listTrafficStudentPermits(
  campus?: TrafficCampus,
): Promise<TrafficStudentPermit[]> {
  let query = supabase
    .from('traffic_student_permits')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(250);

  if (campus) query = query.eq('campus', campus);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateVisitorPassStatus(input: {
  passId: string;
  status: TrafficPassStatus;
  gateName?: string;
  notes?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('traffic_update_visitor_pass_status', {
    p_pass_id: input.passId,
    p_status: input.status,
    p_gate_name: input.gateName,
    p_notes: input.notes,
  });
  if (error) throw error;
}

export async function updateStudentPermitStatus(input: {
  permitId: string;
  status: TrafficStudentPermitStatus;
  notes?: string;
  validUntil?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('traffic_update_student_permit_status', {
    p_permit_id: input.permitId,
    p_status: input.status,
    p_notes: input.notes,
    p_valid_until: input.validUntil,
  });
  if (error) throw error;
}

export async function listTrafficPermitTemplates(
  campus?: TrafficCampus,
): Promise<TrafficPermitTemplate[]> {
  let query = supabase
    .from('traffic_permit_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (campus) query = query.eq('campus', campus);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function uploadTrafficPermitTemplate(input: {
  file: File;
  campus: TrafficCampus | null;
  createdBy: string;
  name: string;
  notes: string;
  permitKind: TrafficPermitKind;
  status?: TrafficTemplateStatus;
}): Promise<TrafficPermitTemplate> {
  if (!TRAFFIC_TEMPLATE_MIME_TYPES.includes(input.file.type as (typeof TRAFFIC_TEMPLATE_MIME_TYPES)[number])) {
    throw new Error('Upload a JPG, PNG or WebP image.');
  }
  if (input.file.size > TRAFFIC_MAX_TEMPLATE_BYTES) {
    throw new Error('The permit image must be smaller than 10 MB.');
  }

  const extension = input.file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeName = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'permit';
  const storagePath = (input.campus ?? 'all') + '/' + input.createdBy + '/' + Date.now() + '-' + safeName + '.' + extension;

  const { error: uploadError } = await supabase.storage
    .from(TRAFFIC_TEMPLATE_BUCKET)
    .upload(storagePath, input.file, {
      cacheControl: '3600',
      contentType: input.file.type,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('traffic_permit_templates')
    .insert({
      campus: input.campus,
      created_by: input.createdBy,
      name: input.name.trim(),
      notes: input.notes.trim() || null,
      permit_kind: input.permitKind,
      status: input.status ?? 'draft',
      storage_path: storagePath,
    })
    .select('*')
    .single();

  if (error) {
    await supabase.storage.from(TRAFFIC_TEMPLATE_BUCKET).remove([storagePath]);
    throw error;
  }

  return data;
}

export function subscribeToTrafficOperations(
  onChange: () => void,
  campus?: TrafficCampus,
): () => void {
  const filter = campus ? { filter: 'campus=eq.' + campus } : {};
  const channel = supabase
    .channel('traffic-operations-' + (campus ?? 'all'))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'traffic_student_permits', ...filter },
      onChange,
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function trafficErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    if (error.message.includes('Could not find the function') || error.message.includes('schema cache')) {
      return 'Traffic services are visible, but the Supabase Traffic migration still needs to be deployed.';
    }
    return error.message;
  }
  return 'Traffic services could not be reached. Please try again.';
}
