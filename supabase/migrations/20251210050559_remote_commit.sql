-- Chat rooms for security/admin staff communication
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  campus campus_location,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Chat messages with real-time support
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT NOT NULL,
  incident_id UUID REFERENCES public.incidents(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_rooms (staff only)
CREATE POLICY "Staff can view chat rooms"
ON public.chat_rooms
FOR SELECT
USING (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()));

CREATE POLICY "Staff can create chat rooms"
ON public.chat_rooms
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()));

CREATE POLICY "Staff can update own chat rooms"
ON public.chat_rooms
FOR UPDATE
USING (created_by = auth.uid() OR is_super_admin(auth.uid()));

-- RLS policies for chat_messages (staff only)
CREATE POLICY "Staff can view messages"
ON public.chat_messages
FOR SELECT
USING (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()));

CREATE POLICY "Staff can send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()) OR is_campus_admin(auth.uid()));

-- Enable real-time for chat messages
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Enable real-time for incidents (for student My Reports)
ALTER TABLE public.incidents REPLICA IDENTITY FULL;