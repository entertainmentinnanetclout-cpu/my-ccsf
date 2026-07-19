ALTER TABLE public.carousel_images
  ALTER COLUMN created_by SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Staff insert carousel images" ON public.carousel_images;
DROP POLICY IF EXISTS "Staff update carousel images" ON public.carousel_images;
DROP POLICY IF EXISTS "Staff delete carousel images" ON public.carousel_images;
DROP POLICY IF EXISTS "Users can view carousel images for their campus" ON public.carousel_images;

CREATE POLICY "Scoped staff insert carousel images"
ON public.carousel_images
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin((SELECT auth.uid()))
  OR (
    is_campus_admin((SELECT auth.uid()))
    AND campus = (get_user_campus((SELECT auth.uid())))::text
  )
);

CREATE POLICY "Scoped staff update carousel images"
ON public.carousel_images
FOR UPDATE
TO authenticated
USING (
  is_super_admin((SELECT auth.uid()))
  OR (
    is_campus_admin((SELECT auth.uid()))
    AND campus = (get_user_campus((SELECT auth.uid())))::text
  )
)
WITH CHECK (
  is_super_admin((SELECT auth.uid()))
  OR (
    is_campus_admin((SELECT auth.uid()))
    AND campus = (get_user_campus((SELECT auth.uid())))::text
  )
);

CREATE POLICY "Scoped staff delete carousel images"
ON public.carousel_images
FOR DELETE
TO authenticated
USING (
  is_super_admin((SELECT auth.uid()))
  OR (
    is_campus_admin((SELECT auth.uid()))
    AND campus = (get_user_campus((SELECT auth.uid())))::text
  )
);

CREATE POLICY "Role and campus scoped carousel visibility"
ON public.carousel_images
FOR SELECT
TO authenticated
USING (
  is_super_admin((SELECT auth.uid()))
  OR (
    is_campus_admin((SELECT auth.uid()))
    AND campus = (get_user_campus((SELECT auth.uid())))::text
  )
  OR (
    is_active = true
    AND (
      campus = (get_user_campus((SELECT auth.uid())))::text
      OR campus = 'all'
    )
  )
);
