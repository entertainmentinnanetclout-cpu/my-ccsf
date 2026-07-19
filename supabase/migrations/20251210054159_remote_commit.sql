-- Seed default carousel images from the existing assets
INSERT INTO carousel_images (campus, image_url, title, category, display_order, is_active) VALUES
  ('pretoria_west_main', '/src/assets/campus-building.jpg', 'TUT Campus Building', 'Campus', 0, true),
  ('polokwane', '/src/assets/campus-polokwane-entrance.jpg', 'Polokwane Campus Entrance', 'Campus', 1, true),
  ('pretoria_west_main', '/src/assets/campus-security-staff.jpg', 'Campus Security Team', 'Security', 2, true),
  ('pretoria_west_main', '/src/assets/campus-tut-hall.jpg', 'TUT Main Hall', 'Campus', 3, true),
  ('pretoria_west_main', '/src/assets/campus-courtyard.jpg', 'Campus Courtyard', 'Facilities', 4, true),
  ('arcadia', '/src/assets/campus-building.jpg', 'Arcadia Campus Building', 'Campus', 0, true),
  ('soshanguve_south', '/src/assets/campus-tut-hall.jpg', 'Soshanguve South Hall', 'Campus', 0, true),
  ('soshanguve_north', '/src/assets/campus-courtyard.jpg', 'Soshanguve North Courtyard', 'Facilities', 0, true),
  ('garankuwa', '/src/assets/campus-building.jpg', 'Ga-Rankuwa Campus', 'Campus', 0, true),
  ('mbombela', '/src/assets/campus-building.jpg', 'Mbombela Campus', 'Campus', 0, true),
  ('giyani', '/src/assets/campus-building.jpg', 'Giyani Campus', 'Campus', 0, true),
  ('emalahleni', '/src/assets/campus-building.jpg', 'eMalahleni Campus', 'Campus', 0, true),
  ('arts', '/src/assets/campus-building.jpg', 'Arts Campus', 'Campus', 0, true);

-- Create storage bucket for carousel images if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('carousel-images', 'carousel-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for carousel images
CREATE POLICY "Anyone can view carousel images"
ON storage.objects FOR SELECT
USING (bucket_id = 'carousel-images');

CREATE POLICY "Super admins can upload carousel images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'carousel-images' AND 
  (public.is_super_admin(auth.uid()) OR public.is_campus_admin(auth.uid()))
);

CREATE POLICY "Super admins can update carousel images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'carousel-images' AND 
  (public.is_super_admin(auth.uid()) OR public.is_campus_admin(auth.uid()))
);

CREATE POLICY "Super admins can delete carousel images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'carousel-images' AND 
  (public.is_super_admin(auth.uid()) OR public.is_campus_admin(auth.uid()))
);