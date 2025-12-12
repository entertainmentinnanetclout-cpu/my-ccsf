-- Add media_url and media_type columns to chat_messages for file sharing
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS media_type text,
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- Create chat_room_members table for managing room membership
CREATE TABLE IF NOT EXISTS public.chat_room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  last_read_at timestamp with time zone DEFAULT now(),
  is_admin boolean DEFAULT false,
  UNIQUE(room_id, user_id)
);

-- Enable RLS on chat_room_members
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_room_members
CREATE POLICY "Staff can view room members"
ON public.chat_room_members FOR SELECT
USING (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()));

CREATE POLICY "Staff can join rooms"
ON public.chat_room_members FOR INSERT
WITH CHECK (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()));

CREATE POLICY "Staff can update own membership"
ON public.chat_room_members FOR UPDATE
USING (user_id = auth.uid() OR is_super_admin(auth.uid()));

CREATE POLICY "Room admins can remove members"
ON public.chat_room_members FOR DELETE
USING (is_super_admin(auth.uid()) OR (
  EXISTS (SELECT 1 FROM chat_room_members WHERE room_id = chat_room_members.room_id AND user_id = auth.uid() AND is_admin = true)
));

-- Add room_type to chat_rooms for group/private distinction
ALTER TABLE public.chat_rooms 
ADD COLUMN IF NOT EXISTS room_type text DEFAULT 'group',
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS last_message_at timestamp with time zone DEFAULT now();

-- Create typing_indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS on typing_indicators
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage typing indicators"
ON public.typing_indicators FOR ALL
USING (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()));

-- Create storage bucket for chat media
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-media', 'chat-media', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat-media bucket
CREATE POLICY "Staff can upload chat media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-media' AND
  (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()))
);

CREATE POLICY "Anyone can view chat media"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');

CREATE POLICY "Staff can delete own chat media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-media' AND
  (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()))
);

-- Enable realtime for new tables only (chat_messages already has it)
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_room_members;

-- Set REPLICA IDENTITY for realtime
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE typing_indicators REPLICA IDENTITY FULL;
ALTER TABLE chat_room_members REPLICA IDENTITY FULL;

-- Function to auto-create "All CCSF Staff" room and add all admins
CREATE OR REPLACE FUNCTION public.ensure_all_staff_room()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff_room_id uuid;
  admin_record RECORD;
BEGIN
  SELECT id INTO staff_room_id FROM chat_rooms WHERE name = 'All CCSF Staff' LIMIT 1;
  
  IF staff_room_id IS NULL THEN
    INSERT INTO chat_rooms (name, room_type, description)
    VALUES ('All CCSF Staff', 'group', 'Official channel for all CCSF security staff')
    RETURNING id INTO staff_room_id;
  END IF;
  
  FOR admin_record IN 
    SELECT ur.user_id FROM user_roles ur WHERE ur.role IN ('admin', 'security')
  LOOP
    INSERT INTO chat_room_members (room_id, user_id, is_admin)
    VALUES (staff_room_id, admin_record.user_id, false)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  END LOOP;
END;
$$;

SELECT ensure_all_staff_room();

-- Trigger to auto-add new admins to the All Staff room
CREATE OR REPLACE FUNCTION public.auto_add_admin_to_staff_room()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff_room_id uuid;
BEGIN
  IF NEW.role IN ('admin', 'security') THEN
    SELECT id INTO staff_room_id FROM chat_rooms WHERE name = 'All CCSF Staff' LIMIT 1;
    
    IF staff_room_id IS NOT NULL THEN
      INSERT INTO chat_room_members (room_id, user_id, is_admin)
      VALUES (staff_room_id, NEW.user_id, false)
      ON CONFLICT (room_id, user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_admin_created_add_to_staff_room ON user_roles;
CREATE TRIGGER on_admin_created_add_to_staff_room
  AFTER INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_admin_to_staff_room();