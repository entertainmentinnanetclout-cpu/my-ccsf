-- Allow common Android and iOS evidence formats in both private report buckets.
-- Existing 10 MB bucket limits and access policies remain unchanged.

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
  'video/mp4'
]::text[]
where id in ('incident-media', 'pilot-report-attachments');
