-- Update handle_new_user function to include campus from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val user_role;
  user_campus campus_location;
BEGIN
  -- Get role from metadata or default to student
  user_role_val := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student');
  
  -- Get campus from metadata (required for students)
  user_campus := (NEW.raw_user_meta_data->>'campus')::campus_location;
  
  -- Insert profile with campus
  INSERT INTO public.profiles (id, email, full_name, student_number, campus)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'student_number',
    user_campus
  );
  
  -- Insert role in separate table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role_val);
  
  RETURN NEW;
END;
$$;