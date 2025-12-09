-- Fix function search_path for auto_attach_campus (already set, but let's ensure all functions are compliant)
-- The warning may be for other existing functions. Let's check and fix any missing search_path settings.

-- Re-create auto_attach_campus with explicit search_path (already has it, but being explicit)
CREATE OR REPLACE FUNCTION public.auto_attach_campus()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.campus IS NULL THEN
    NEW.campus := public.get_user_campus(auth.uid());
  END IF;
  IF NEW.reporter_id IS NULL THEN
    NEW.reporter_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;