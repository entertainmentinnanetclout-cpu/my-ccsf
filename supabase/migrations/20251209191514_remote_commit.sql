-- Add medical health fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS blood_type text,
ADD COLUMN IF NOT EXISTS allergies text,
ADD COLUMN IF NOT EXISTS chronic_conditions text,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
ADD COLUMN IF NOT EXISTS medical_aid_name text,
ADD COLUMN IF NOT EXISTS medical_aid_number text,
ADD COLUMN IF NOT EXISTS disability_status text,
ADD COLUMN IF NOT EXISTS special_needs text;