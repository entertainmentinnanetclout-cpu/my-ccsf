-- Drop the existing carousel image view policy and recreate with campus filtering
DROP POLICY IF EXISTS "Anyone can view active carousel images" ON carousel_images;

-- Students can only view carousel images from their campus or 'all' campus
CREATE POLICY "Users can view carousel images for their campus"
ON carousel_images
FOR SELECT
USING (
  is_active = true 
  AND (
    -- Super admins and campus admins can see all images
    is_super_admin(auth.uid()) 
    OR is_campus_admin(auth.uid())
    -- Regular users can only see their campus images or 'all' campus images
    OR campus = get_user_campus(auth.uid())::text
    OR campus = 'all'
  )
);

-- Update incidents policy to filter by campus for non-admins
DROP POLICY IF EXISTS "Allow viewing all incidents" ON incidents;

-- Users can view their own incidents, admins can view all or campus-specific
CREATE POLICY "Users can view incidents based on role"
ON incidents
FOR SELECT
USING (
  -- Super admins can see all incidents
  is_super_admin(auth.uid())
  -- Campus admins can see incidents from their campus
  OR (is_campus_admin(auth.uid()) AND campus = get_user_campus(auth.uid()))
  -- Users can see their own reported incidents
  OR reporter_id = auth.uid()
);