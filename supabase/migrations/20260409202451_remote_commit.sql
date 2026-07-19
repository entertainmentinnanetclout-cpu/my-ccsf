
-- 1. Fix chat_room_members DELETE policy (self-referencing bug)
DROP POLICY IF EXISTS "Room admins can remove members" ON chat_room_members;
CREATE POLICY "Room admins can remove members"
  ON chat_room_members FOR DELETE
  USING (
    is_super_admin(auth.uid()) OR (
      EXISTS (
        SELECT 1 FROM chat_room_members chat_room_members_1
        WHERE chat_room_members_1.room_id = chat_room_members.room_id
          AND chat_room_members_1.user_id = auth.uid()
          AND chat_room_members_1.is_admin = true
      )
    )
  );

-- 2. Fix accredited_residences public exposure
DROP POLICY IF EXISTS "Public can view basic accredited residences" ON accredited_residences;
CREATE POLICY "Authenticated users can view accredited residences"
  ON accredited_residences FOR SELECT
  TO authenticated
  USING (is_accredited = true);

-- 3. Remove anonymous access to incident media storage
DROP POLICY IF EXISTS "Anyone can view incident media" ON storage.objects;

-- 4. Fix incidents INSERT policy to bind reporter_id
DROP POLICY IF EXISTS "Authenticated users can submit incidents" ON incidents;
CREATE POLICY "Authenticated users can submit incidents"
  ON incidents FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid() OR reporter_id IS NULL);
