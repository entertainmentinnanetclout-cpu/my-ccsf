-- Add missing campus to enum
ALTER TYPE campus_location ADD VALUE IF NOT EXISTS 'emalahleni';

-- Helper function to get user's campus
CREATE OR REPLACE FUNCTION public.get_user_campus(_user_id uuid)
RETURNS campus_location
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT campus FROM public.profiles WHERE id = _user_id
$$;

-- Helper function to check if user is super admin (admin role OR is_head in admin_access)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'admin'::user_role) OR is_head_admin(_user_id)
$$;

-- Helper function to check if user is campus admin (security role)
CREATE OR REPLACE FUNCTION public.is_campus_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'security'::user_role)
$$;

-- Fix profiles policies for campus-based access
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Campus admins can view campus students"
ON public.profiles
FOR SELECT
USING (
  is_campus_admin(auth.uid()) 
  AND campus = get_user_campus(auth.uid())
  AND has_role(id, 'student'::user_role)
);

-- Fix incidents policies - remove overly permissive policy
DROP POLICY IF EXISTS "Anyone can view incidents" ON public.incidents;

CREATE POLICY "Students can view own incidents"
ON public.incidents
FOR SELECT
USING (reporter_id = auth.uid() AND has_role(auth.uid(), 'student'::user_role));

CREATE POLICY "Campus admins can view campus incidents"
ON public.incidents
FOR SELECT
USING (
  is_campus_admin(auth.uid())
  AND campus = get_user_campus(auth.uid())
);

CREATE POLICY "Super admins can view all incidents"
ON public.incidents
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Update incident insert policy to auto-attach campus
DROP POLICY IF EXISTS "Authenticated users can create incidents" ON public.incidents;

CREATE POLICY "Students can create incidents"
ON public.incidents
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'student'::user_role)
);

-- Trigger to auto-attach campus_id on incident creation
CREATE OR REPLACE FUNCTION public.auto_attach_campus()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.campus IS NULL THEN
    NEW.campus := get_user_campus(auth.uid());
  END IF;
  IF NEW.reporter_id IS NULL THEN
    NEW.reporter_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS auto_attach_campus_trigger ON public.incidents;
CREATE TRIGGER auto_attach_campus_trigger
  BEFORE INSERT ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_attach_campus();

-- Update announcements policies for campus admins
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;

CREATE POLICY "Campus and super admins can manage announcements"
ON public.announcements
FOR ALL
USING (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()));

-- Update admin_logs policies
DROP POLICY IF EXISTS "Admins can view logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Admins can create logs" ON public.admin_logs;

CREATE POLICY "Campus admins can view campus logs"
ON public.admin_logs
FOR SELECT
USING (
  is_super_admin(auth.uid()) 
  OR (is_campus_admin(auth.uid()) AND admin_id = auth.uid())
);

CREATE POLICY "Admins can create logs"
ON public.admin_logs
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()));