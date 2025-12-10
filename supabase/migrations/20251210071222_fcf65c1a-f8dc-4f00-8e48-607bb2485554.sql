-- Remove permissive developer mode policies and enforce authentication

-- Drop the overly permissive carousel_images policy
DROP POLICY IF EXISTS "Super admins can manage carousel images" ON public.carousel_images;

-- Create proper authenticated policies for carousel_images
CREATE POLICY "Authenticated admins can manage carousel images"
ON public.carousel_images
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()));

-- Update incidents policies to require authentication for modifications
DROP POLICY IF EXISTS "Allow incident submissions" ON public.incidents;
DROP POLICY IF EXISTS "Allow incident updates" ON public.incidents;

CREATE POLICY "Authenticated users can submit incidents"
ON public.incidents
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can update incidents"
ON public.incidents
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()) OR reporter_id = auth.uid());

-- Update announcements to require auth for management
DROP POLICY IF EXISTS "Campus and super admins can manage announcements" ON public.announcements;

CREATE POLICY "Authenticated admins can manage announcements"
ON public.announcements
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()));