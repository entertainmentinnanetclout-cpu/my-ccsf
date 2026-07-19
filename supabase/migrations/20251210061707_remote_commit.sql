-- Create table for live location updates
CREATE TABLE public.incident_location_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  location_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incident_location_updates ENABLE ROW LEVEL SECURITY;

-- Anyone can view location updates (for admins to see)
CREATE POLICY "Anyone can view location updates"
ON public.incident_location_updates FOR SELECT
USING (true);

-- Authenticated users can insert location updates
CREATE POLICY "Authenticated users can insert location updates"
ON public.incident_location_updates FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_location_updates;

-- Create index for faster queries
CREATE INDEX idx_incident_location_updates_incident_id ON public.incident_location_updates(incident_id);
CREATE INDEX idx_incident_location_updates_created_at ON public.incident_location_updates(created_at DESC);