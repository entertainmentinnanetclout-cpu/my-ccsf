-- Remove the student role from super admin, keeping only the admin role
DELETE FROM public.user_roles 
WHERE user_id = '740b752c-9e54-4e8b-8017-5654052400e1' 
AND role = 'student';