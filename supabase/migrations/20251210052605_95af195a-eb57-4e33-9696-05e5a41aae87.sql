-- Enable real-time for carousel_images
ALTER TABLE public.carousel_images REPLICA IDENTITY FULL;

-- Add carousel_images to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'carousel_images'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.carousel_images;
  END IF;
END $$;

-- Create function for super admins to assign campus admins
CREATE OR REPLACE FUNCTION public.assign_campus_admin(
  p_user_id UUID,
  p_campus campus_location,
  p_is_head BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is a super admin or head admin
  IF NOT is_super_admin(auth.uid()) AND NOT is_head_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can assign campus admins';
  END IF;

  -- Ensure user has security role
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'security') THEN
    INSERT INTO user_roles (user_id, role) VALUES (p_user_id, 'security')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Add or update admin_access
  INSERT INTO admin_access (admin_id, campus, is_head)
  VALUES (p_user_id, p_campus, p_is_head)
  ON CONFLICT (admin_id, campus) DO UPDATE SET is_head = p_is_head;
  
  -- Update profile campus
  UPDATE profiles SET campus = p_campus WHERE id = p_user_id;
END;
$$;

-- Create function to remove campus admin
CREATE OR REPLACE FUNCTION public.remove_campus_admin(p_user_id UUID, p_campus campus_location)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is a super admin or head admin
  IF NOT is_super_admin(auth.uid()) AND NOT is_head_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can remove campus admins';
  END IF;

  -- Remove admin_access
  DELETE FROM admin_access WHERE admin_id = p_user_id AND campus = p_campus;
END;
$$;

-- Add unique constraint for admin_access if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_access_admin_id_campus_key'
  ) THEN
    ALTER TABLE admin_access ADD CONSTRAINT admin_access_admin_id_campus_key UNIQUE (admin_id, campus);
  END IF;
END $$;