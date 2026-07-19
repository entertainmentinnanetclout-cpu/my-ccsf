-- Create message_reactions table for emoji reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Staff can view reactions"
ON public.message_reactions FOR SELECT
USING (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()));

CREATE POLICY "Staff can add reactions"
ON public.message_reactions FOR INSERT
WITH CHECK (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()));

CREATE POLICY "Users can remove own reactions"
ON public.message_reactions FOR DELETE
USING (user_id = auth.uid());

-- Enable realtime for reactions
ALTER TABLE message_reactions REPLICA IDENTITY FULL;

-- Function to send push notification on new chat message
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_name text;
  sender_name text;
  member_record RECORD;
BEGIN
  -- Get room name
  SELECT name INTO room_name FROM chat_rooms WHERE id = NEW.room_id;
  
  -- Get sender name
  SELECT COALESCE(full_name, email) INTO sender_name 
  FROM profiles WHERE id = NEW.sender_id;
  
  -- Notify all room members except sender
  FOR member_record IN 
    SELECT crm.user_id FROM chat_room_members crm
    WHERE crm.room_id = NEW.room_id AND crm.user_id != NEW.sender_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      member_record.user_id,
      'New message in ' || room_name,
      sender_name || ': ' || LEFT(NEW.content, 100),
      'chat'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for chat notifications
DROP TRIGGER IF EXISTS on_chat_message_notify ON chat_messages;
CREATE TRIGGER on_chat_message_notify
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_chat_message();