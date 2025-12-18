-- Create escalation records table
CREATE TABLE public.case_escalations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  escalated_by UUID NOT NULL REFERENCES public.profiles(id),
  agency_type TEXT NOT NULL CHECK (agency_type IN ('saps', 'metro_police')),
  police_station TEXT NOT NULL,
  police_station_address TEXT,
  police_station_phone TEXT,
  cas_number TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'acknowledged', 'in_progress', 'resolved', 'rejected')),
  notes TEXT,
  api_reference_id TEXT,
  api_response JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campus police stations mapping table
CREATE TABLE public.campus_police_stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campus TEXT NOT NULL,
  station_name TEXT NOT NULL,
  station_type TEXT NOT NULL CHECK (station_type IN ('saps', 'metro_police')),
  address TEXT,
  phone TEXT,
  email TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_police_stations ENABLE ROW LEVEL SECURITY;

-- RLS policies for case_escalations
CREATE POLICY "Super admins can manage escalations"
ON public.case_escalations
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Security staff can view campus escalations"
ON public.case_escalations
FOR SELECT
USING (
  has_role(auth.uid(), 'security'::user_role) AND
  EXISTS (
    SELECT 1 FROM incidents i
    WHERE i.id = case_escalations.incident_id
    AND i.campus = get_user_campus(auth.uid())
  )
);

-- RLS policies for campus_police_stations
CREATE POLICY "Anyone can view police stations"
ON public.campus_police_stations
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage police stations"
ON public.campus_police_stations
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Create trigger for updated_at
CREATE TRIGGER update_case_escalations_updated_at
BEFORE UPDATE ON public.case_escalations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert default police stations for each campus
INSERT INTO public.campus_police_stations (campus, station_name, station_type, address, phone, is_primary) VALUES
('pretoria_west_main', 'Pretoria West SAPS', 'saps', '225 Church Street West, Pretoria West', '012 358 6700', true),
('pretoria_west_main', 'Tshwane Metro Police - West', 'metro_police', 'Pretoria West', '012 358 7095', false),
('arcadia', 'Arcadia SAPS', 'saps', '277 Nelson Mandela Dr, Arcadia', '012 341 9000', true),
('arcadia', 'Tshwane Metro Police - Central', 'metro_police', 'Arcadia, Pretoria', '012 358 7095', false),
('soshanguve_south', 'Soshanguve SAPS', 'saps', 'Block L, Soshanguve', '012 799 1500', true),
('soshanguve_north', 'Soshanguve SAPS', 'saps', 'Block L, Soshanguve', '012 799 1500', true),
('garankuwa', 'Garankuwa SAPS', 'saps', 'Zone 1, Garankuwa', '012 700 1100', true),
('polokwane', 'Polokwane SAPS', 'saps', '74 Landros Mare St, Polokwane', '015 290 6000', true),
('polokwane', 'Polokwane Metro Police', 'metro_police', 'Polokwane CBD', '015 290 2000', false),
('mbombela', 'Mbombela SAPS', 'saps', '1 Samora Machel Dr, Mbombela', '013 759 1000', true),
('giyani', 'Giyani SAPS', 'saps', 'Main Road, Giyani', '015 812 0020', true),
('emalahleni', 'eMalahleni SAPS', 'saps', '20 Mandela St, eMalahleni', '013 653 9000', true),
('arts', 'Pretoria Central SAPS', 'saps', '217 Pretorius St, Pretoria', '012 353 4000', true);