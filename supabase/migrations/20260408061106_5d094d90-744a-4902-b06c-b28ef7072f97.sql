
-- Delete student role for phutiadmin
DELETE FROM public.user_roles WHERE user_id = '0e108db7-d0c1-4d13-8837-04c8cd5019e7' AND role = 'student';

-- Insert admin role
INSERT INTO public.user_roles (user_id, role) VALUES ('0e108db7-d0c1-4d13-8837-04c8cd5019e7', 'admin')
ON CONFLICT DO NOTHING;
