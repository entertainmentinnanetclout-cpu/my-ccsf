-- Add accuracy column to track location precision
ALTER TABLE public.incident_location_updates 
ADD COLUMN accuracy_meters DOUBLE PRECISION;