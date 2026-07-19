
-- Remove student role
DELETE FROM public.user_roles WHERE user_id = '918810a6-3a28-447d-81a1-8f3384f090f5' AND role = 'student';

-- Add security role
INSERT INTO public.user_roles (user_id, role) VALUES ('918810a6-3a28-447d-81a1-8f3384f090f5', 'security')
ON CONFLICT DO NOTHING;

-- Grant admin access for pretoria_west_main
INSERT INTO public.admin_access (admin_id, campus, is_head) VALUES ('918810a6-3a28-447d-81a1-8f3384f090f5', 'pretoria_west_main', false)
ON CONFLICT DO NOTHING;

-- Update profile campus
UPDATE public.profiles SET campus = 'pretoria_west_main' WHERE id = '918810a6-3a28-447d-81a1-8f3384f090f5';
