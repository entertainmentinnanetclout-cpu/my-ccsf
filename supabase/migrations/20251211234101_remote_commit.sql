-- Drop existing restrictive policies on admin_access
DROP POLICY IF EXISTS "Admins can view own access" ON admin_access;
DROP POLICY IF EXISTS "Head admins can manage access" ON admin_access;

-- Create new policies that allow super admins (role = 'admin') full access
-- Super admins can view all admin_access records
CREATE POLICY "Super admins can view all access" 
ON admin_access 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role) OR admin_id = auth.uid());

-- Super admins and head admins can manage admin_access
CREATE POLICY "Super and head admins can manage access" 
ON admin_access 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role) OR is_head_admin(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR is_head_admin(auth.uid()));