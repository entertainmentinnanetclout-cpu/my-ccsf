-- Drop all carousel-images storage policies and recreate clean ones
DROP POLICY IF EXISTS "Super admins can upload carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can update carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Super admins can delete carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view carousel images" ON storage.objects;

-- Create clean policies for carousel-images bucket (admins only)
CREATE POLICY "Public can view carousel images"
ON storage.objects FOR SELECT
USING (bucket_id = 'carousel-images');

CREATE POLICY "Admins can upload carousel images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'carousel-images' 
  AND (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()))
);

CREATE POLICY "Admins can update carousel images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'carousel-images' 
  AND (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()))
);

CREATE POLICY "Admins can delete carousel images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'carousel-images' 
  AND (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()))
);