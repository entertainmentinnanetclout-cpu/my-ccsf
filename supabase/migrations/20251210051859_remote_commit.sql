-- Push subscriptions table for web push notifications
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a function to notify on incident status change
CREATE OR REPLACE FUNCTION public.notify_incident_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert notification for the reporter when status changes
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.reporter_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_incident_id)
    VALUES (
      NEW.reporter_id,
      'Incident Status Updated',
      'Your incident "' || NEW.title || '" status changed to ' || NEW.status,
      'info',
      NEW.id
    );
  END IF;
  
  -- Insert notification when incident is assigned
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_incident_id)
    VALUES (
      NEW.assigned_to,
      'Incident Assigned',
      'You have been assigned to incident: ' || NEW.title,
      'info',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for incident status/assignment changes
CREATE TRIGGER on_incident_update
  AFTER UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_incident_status_change();

-- Enable real-time for notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Function to get security officers for a campus
CREATE OR REPLACE FUNCTION public.get_security_officers(p_campus campus_location DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  campus campus_location
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.email, p.campus
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role = 'security'
  AND (p_campus IS NULL OR p.campus = p_campus);
$$;