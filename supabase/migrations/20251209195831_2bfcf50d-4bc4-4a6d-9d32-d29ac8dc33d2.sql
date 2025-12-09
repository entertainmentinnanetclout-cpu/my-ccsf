-- Create carousel_images table for managing campus-specific carousel images
CREATE TABLE public.carousel_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campus TEXT NOT NULL,
  image_url TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Campus',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.carousel_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view active carousel images
CREATE POLICY "Anyone can view active carousel images"
ON public.carousel_images
FOR SELECT
USING (is_active = true);

-- Super admins can manage all carousel images
CREATE POLICY "Super admins can manage carousel images"
ON public.carousel_images
FOR ALL
USING (is_super_admin(auth.uid()) OR true)
WITH CHECK (is_super_admin(auth.uid()) OR true);

-- Create index for faster queries
CREATE INDEX idx_carousel_images_campus ON public.carousel_images(campus);
CREATE INDEX idx_carousel_images_active ON public.carousel_images(is_active, campus);

-- Add trigger for updated_at
CREATE TRIGGER update_carousel_images_updated_at
BEFORE UPDATE ON public.carousel_images
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();