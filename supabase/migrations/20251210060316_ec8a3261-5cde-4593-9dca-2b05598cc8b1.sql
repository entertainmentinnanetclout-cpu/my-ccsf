-- Fix storage policies for carousel-images bucket to allow uploads

-- First, remove existing policies if any
DROP POLICY IF EXISTS "Anyone can view carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete carousel images" ON storage.objects;

-- Create proper policies for carousel-images bucket
CREATE POLICY "Anyone can view carousel images"
ON storage.objects FOR SELECT
USING (bucket_id = 'carousel-images');

CREATE POLICY "Authenticated users can upload carousel images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'carousel-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update carousel images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'carousel-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete carousel images"
ON storage.objects FOR DELETE
USING (bucket_id = 'carousel-images' AND auth.uid() IS NOT NULL);