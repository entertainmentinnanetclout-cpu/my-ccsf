-- Create table for storing admin bento dashboard layouts
CREATE TABLE public.bento_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.bento_layouts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own layout
CREATE POLICY "Users can view own bento layout"
ON public.bento_layouts
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own layout
CREATE POLICY "Users can insert own bento layout"
ON public.bento_layouts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own layout
CREATE POLICY "Users can update own bento layout"
ON public.bento_layouts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own layout
CREATE POLICY "Users can delete own bento layout"
ON public.bento_layouts
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_bento_layouts_updated_at
  BEFORE UPDATE ON public.bento_layouts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();