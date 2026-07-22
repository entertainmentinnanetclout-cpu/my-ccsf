-- Release the expanded Pilot campus guide and downloadable document library.
-- Documents are generated deterministically during every application build and
-- served from public/downloads so the resource centre is reproducible.

update public.pilot_resource_documents
set title = 'TUT Pretoria Campus Safety, Security & Navigation Handbook',
    description = 'A comprehensive CCSF and TUT branded handbook covering Buildings 1-60, verified departments and student-service routes, online-scam reporting, safety guidance and emergency support.',
    document_type = 'safety_guide',
    version = '2.1',
    publication_date = date '2026-07-22',
    download_url = '/downloads/My-CCSF-TUT-Pretoria-Campus-Safety-Security-Navigation-Handbook-v2.1.pdf',
    storage_path = null,
    file_name = 'My-CCSF-TUT-Pretoria-Campus-Safety-Security-Navigation-Handbook-v2.1.pdf',
    file_size_bytes = 76667,
    is_active = true,
    starts_at = null,
    expires_at = null
where id = '40000000-0000-4000-8000-000000000101';

insert into public.pilot_resource_documents(
  id,
  title,
  description,
  document_type,
  version,
  publication_date,
  download_url,
  storage_path,
  file_name,
  file_size_bytes,
  is_active
) values (
  '40000000-0000-4000-8000-000000000102',
  'CCSF Crime Prevention Unit Operating Structure & Pilot Activation Plan',
  'The updated corporate operating structure, CPS reporting line, six-person functional model, case-handling workflow, online-scam prevention campaign, campus activation plan and estimated implementation finances.',
  'other',
  '1.1',
  date '2026-07-22',
  '/downloads/CCSF-Crime-Prevention-Unit-Operating-Structure-Pilot-Activation-Plan-v1.1.pptx',
  null,
  'CCSF-Crime-Prevention-Unit-Operating-Structure-Pilot-Activation-Plan-v1.1.pptx',
  43777,
  true
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  document_type = excluded.document_type,
  version = excluded.version,
  publication_date = excluded.publication_date,
  download_url = excluded.download_url,
  storage_path = excluded.storage_path,
  file_name = excluded.file_name,
  file_size_bytes = excluded.file_size_bytes,
  is_active = true,
  starts_at = null,
  expires_at = null;

update public.pilot_carousel_slides
set title = 'Open the Campus Guide & Document Library',
    description = 'Download the updated campus navigation and safety handbook plus the CCSF Crime Prevention Unit operating structure and Pilot activation plan.',
    eyebrow = 'Campus resources',
    icon_key = 'guide',
    button_label = 'Open document library',
    action_key = 'resources',
    is_active = true
where id = '40000000-0000-4000-8000-000000000008';
