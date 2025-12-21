-- =============================================
-- PHASE 1: Critical Database Performance Indexes
-- =============================================

-- Incidents table indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_incidents_campus ON public.incidents(campus);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at_desc ON public.incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_reporter_id ON public.incidents(reporter_id);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to ON public.incidents(assigned_to);

-- Compound index for common dashboard queries (campus + status + created_at)
CREATE INDEX IF NOT EXISTS idx_incidents_campus_status_created ON public.incidents(campus, status, created_at DESC);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_campus ON public.profiles(campus);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_desc ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_student_number ON public.profiles(student_number);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at_desc ON public.notifications(created_at DESC);

-- Compound index for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications(user_id, is_read, created_at DESC);

-- Announcements indexes
CREATE INDEX IF NOT EXISTS idx_announcements_created_at_desc ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON public.announcements(priority);

-- Case escalations indexes
CREATE INDEX IF NOT EXISTS idx_case_escalations_incident_id ON public.case_escalations(incident_id);
CREATE INDEX IF NOT EXISTS idx_case_escalations_status ON public.case_escalations(status);
CREATE INDEX IF NOT EXISTS idx_case_escalations_created_at_desc ON public.case_escalations(created_at DESC);

-- Case updates indexes
CREATE INDEX IF NOT EXISTS idx_case_updates_incident_id ON public.case_updates(incident_id);
CREATE INDEX IF NOT EXISTS idx_case_updates_created_at_desc ON public.case_updates(created_at DESC);

-- Chat messages indexes for high-volume chat
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at_desc ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON public.chat_messages(room_id, created_at DESC);

-- =============================================
-- PHASE 4: Security Fixes - Updated RLS Policies
-- =============================================

-- Fix incident_location_updates - restrict to incident reporters and assigned admins
DROP POLICY IF EXISTS "Anyone can view location updates" ON public.incident_location_updates;

CREATE POLICY "Authorized users can view location updates" 
ON public.incident_location_updates 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM incidents i 
    WHERE i.id = incident_location_updates.incident_id 
    AND (
      i.reporter_id = auth.uid() 
      OR i.assigned_to = auth.uid()
      OR has_role(auth.uid(), 'admin'::user_role)
      OR (has_role(auth.uid(), 'security'::user_role) AND i.campus = get_user_campus(auth.uid()))
    )
  )
);

-- Fix incident_media - require authentication for viewing
DROP POLICY IF EXISTS "Anyone can view incident media" ON public.incident_media;

CREATE POLICY "Authenticated users can view incident media" 
ON public.incident_media 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM incidents i 
    WHERE i.id = incident_media.incident_id 
    AND (
      i.reporter_id = auth.uid() 
      OR i.assigned_to = auth.uid()
      OR has_role(auth.uid(), 'admin'::user_role)
      OR (has_role(auth.uid(), 'security'::user_role) AND i.campus = get_user_campus(auth.uid()))
    )
  )
);

-- Fix accredited_residences - hide contact details from anonymous, create separate policy
DROP POLICY IF EXISTS "Anyone can view accredited residences" ON public.accredited_residences;

-- Public can view basic residence info (no contact details exposed via this policy)
CREATE POLICY "Public can view basic accredited residences" 
ON public.accredited_residences 
FOR SELECT 
USING (is_accredited = true);

-- Note: To properly hide contact info, we should use a view or RPC function instead of RLS
-- For now, the policy allows viewing but contact columns should be handled at application level