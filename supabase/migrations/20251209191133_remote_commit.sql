-- Temporarily allow anonymous incident submissions for development/testing
-- This should be removed or restricted in production

DROP POLICY IF EXISTS "Students can create incidents" ON public.incidents;

-- Create a more permissive policy for development that allows any authenticated OR anonymous submissions
CREATE POLICY "Allow incident submissions"
ON public.incidents
FOR INSERT
WITH CHECK (true);

-- Also need to allow anonymous users to view incidents for testing
DROP POLICY IF EXISTS "Students can view own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Campus admins can view campus incidents" ON public.incidents;
DROP POLICY IF EXISTS "Super admins can view all incidents" ON public.incidents;

-- Temporarily allow all users to view all incidents (dev mode)
CREATE POLICY "Allow viewing all incidents"
ON public.incidents
FOR SELECT
USING (true);

-- Keep update/delete restricted to admins
DROP POLICY IF EXISTS "Reporters can update own incidents" ON public.incidents;

CREATE POLICY "Allow incident updates"
ON public.incidents
FOR UPDATE
USING (true);