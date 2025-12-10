-- Add admin role for ccsf@tut.ac.za
INSERT INTO public.user_roles (user_id, role)
VALUES ('740b752c-9e54-4e8b-8017-5654052400e1', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;