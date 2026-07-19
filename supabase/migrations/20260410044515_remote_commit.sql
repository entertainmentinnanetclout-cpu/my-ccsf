
CREATE TABLE public.wifi_access_points (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campus text NOT NULL,
  name text NOT NULL,
  location text NOT NULL,
  ssid text NOT NULL DEFAULT 'TUT-WiFi',
  band text NOT NULL DEFAULT '2.4GHz',
  x_position double precision NOT NULL DEFAULT 50,
  y_position double precision NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.wifi_access_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage wifi access points"
ON public.wifi_access_points
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()));

CREATE POLICY "Authenticated users can view active wifi access points"
ON public.wifi_access_points
FOR SELECT
TO authenticated
USING (
  is_active = true AND (
    is_super_admin(auth.uid()) OR
    is_campus_admin(auth.uid()) OR
    campus = (get_user_campus(auth.uid()))::text OR
    campus = 'all'
  )
);

CREATE TRIGGER update_wifi_access_points_updated_at
BEFORE UPDATE ON public.wifi_access_points
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
