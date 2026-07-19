-- Create case_updates table to track admin actions/steps on cases
CREATE TABLE public.case_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  update_type TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_updates ENABLE ROW LEVEL SECURITY;

-- Reporters can view updates on their own incidents
CREATE POLICY "Reporters can view case updates on their incidents"
ON public.case_updates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.incidents
    WHERE incidents.id = case_updates.incident_id
    AND incidents.reporter_id = auth.uid()
  )
);

-- Admins/Security can view all case updates
CREATE POLICY "Admins can view all case updates"
ON public.case_updates
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'security'::user_role));

-- Admins/Security can create case updates
CREATE POLICY "Admins can create case updates"
ON public.case_updates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'security'::user_role));

-- Admins can update their own case updates
CREATE POLICY "Admins can update own case updates"
ON public.case_updates
FOR UPDATE
USING (admin_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_updates;