-- Ensure campus admins can only see incidents from their own campus
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view incidents based on role" ON public.incidents;

-- Create more restrictive policy for campus admins
CREATE POLICY "Users can view incidents based on role" 
ON public.incidents 
FOR SELECT 
USING (
  -- Super admins (role = 'admin') can see all
  has_role(auth.uid(), 'admin'::user_role) 
  OR 
  -- Campus admins (security role) can only see their own campus incidents
  (has_role(auth.uid(), 'security'::user_role) AND campus = get_user_campus(auth.uid()))
  OR 
  -- Reporters can see their own incidents
  (reporter_id = auth.uid())
);

-- Ensure campus admins can only see students from their own campus
DROP POLICY IF EXISTS "Campus admins can view campus students" ON public.profiles;

CREATE POLICY "Campus admins can view campus students" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'security'::user_role) 
  AND campus = get_user_campus(auth.uid()) 
  AND has_role(id, 'student'::user_role)
);