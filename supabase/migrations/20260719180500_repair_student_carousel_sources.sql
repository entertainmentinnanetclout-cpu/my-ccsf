-- Phase 2.5 repairs database image paths that only worked in the Vite source tree.
-- eMalahleni had no deployable campus image; the institutional slide keeps the
-- carousel present until an administrator uploads a campus-specific photograph.
update public.carousel_images
set
  image_url = '/og-image.png',
  is_active = (campus = 'emalahleni'),
  updated_at = now()
where image_url ~ '^/?src/';

alter table public.carousel_images
  add constraint carousel_images_use_deployable_urls
  check (image_url !~ '^/?src/')
  not valid;

alter table public.carousel_images
  validate constraint carousel_images_use_deployable_urls;
