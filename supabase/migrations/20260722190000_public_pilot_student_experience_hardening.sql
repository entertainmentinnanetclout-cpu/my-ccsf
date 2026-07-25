-- Harden the public Pilot student experience.
-- Internal CCSF operating documents are removed from student publication.

update public.pilot_resource_documents
set title = 'TUT Pretoria Campus Safety, Security & Navigation Handbook',
    description = 'A premium CCSF and TUT branded public handbook covering Buildings 1-60, student-service routes, academic-scam reporting, evidence protection, safety guidance and emergency support.',
    document_type = 'safety_guide',
    version = '2.2',
    publication_date = date '2026-07-22',
    download_url = '/downloads/My-CCSF-TUT-Pretoria-Campus-Safety-Security-Navigation-Handbook-v2.2.pdf',
    storage_path = null,
    file_name = 'My-CCSF-TUT-Pretoria-Campus-Safety-Security-Navigation-Handbook-v2.2.pdf',
    file_size_bytes = null,
    is_active = true,
    starts_at = null,
    expires_at = null,
    updated_at = now()
where document_type = 'safety_guide'
   or download_url like '%Safety-Security-Navigation-Handbook-v2.1.pdf';

update public.pilot_resource_documents
set title = 'TUT Pretoria Campus Building Structure & Student Services Guide',
    description = 'A public building-number directory and student-service routing guide showing verified locations, confirmation status and where students should go for common campus needs.',
    document_type = 'quick_reference',
    version = '1.0',
    publication_date = date '2026-07-22',
    download_url = '/downloads/My-CCSF-TUT-Pretoria-Campus-Building-Structure-Student-Services-Guide-v1.0.pdf',
    storage_path = null,
    file_name = 'My-CCSF-TUT-Pretoria-Campus-Building-Structure-Student-Services-Guide-v1.0.pdf',
    file_size_bytes = null,
    is_active = true,
    starts_at = null,
    expires_at = null,
    updated_at = now()
where title ilike '%Operating Structure%'
   or title ilike '%Activation Plan%'
   or download_url ilike '%Operating-Structure-Pilot-Activation-Plan%';

insert into public.pilot_resource_documents (
  program_id, title, description, document_type, version, publication_date,
  download_url, storage_path, file_name, file_size_bytes, is_active
)
select
  null,
  'My CCSF Pilot App User Guide',
  'A student-facing guide to Official and Pilot navigation, campus and residence carousels, academic-fraud reporting, private evidence, case tracking, documents, reviews and emergency limitations.',
  'other',
  '1.0',
  date '2026-07-22',
  '/downloads/My-CCSF-Pilot-App-User-Guide-v1.0.pdf',
  null,
  'My-CCSF-Pilot-App-User-Guide-v1.0.pdf',
  null,
  true
where not exists (
  select 1 from public.pilot_resource_documents
  where file_name = 'My-CCSF-Pilot-App-User-Guide-v1.0.pdf'
     or title = 'My CCSF Pilot App User Guide'
);

update public.pilot_resource_documents
set is_active = false,
    updated_at = now()
where (
  title ~* 'operating[- ]structure|activation plan|six[- ]person|functional allocation|financial framework|governance|internal case[- ]handling'
  or description ~* 'operating[- ]structure|six[- ]person|functional allocation|financial framework|governance|internal case[- ]handling'
  or download_url ~* 'Crime-Prevention-Unit-Operating-Structure-Pilot-Activation-Plan'
)
and file_name <> 'My-CCSF-TUT-Pretoria-Campus-Building-Structure-Student-Services-Guide-v1.0.pdf';

update public.pilot_carousel_slides
set title = 'Open the Campus Guide & Public Document Library',
    description = 'Download the branded campus handbook, Building Structure and Student Services Guide, and My CCSF Pilot App User Guide.',
    eyebrow = 'Public student resources',
    icon_key = 'guide',
    button_label = 'Open document library',
    action_key = 'resources',
    is_active = true,
    updated_at = now()
where action_key = 'resources'
   or title ilike '%Campus Guide%Document Library%';

update public.pilot_scenarios
set instructions = 'Report people selling paid mark changes, courses or enrolment access, fake sick letters, fake WIL placements, fake academic records or impersonated administrative services. Add factual details and attach screenshots, PDFs, payment requests, usernames, links or other relevant evidence.',
    scenario_type = 'standard_report',
    expected_category = 'Fraud',
    requires_location = false,
    requires_live_tracking = false,
    requires_attachment = true,
    requires_notification = true,
    display_order = 1,
    is_active = true,
    simulated_severity = 'medium',
    routing_destination = 'campus_security',
    updated_at = now()
where title = 'Academic Fraud & Fake Admin Services';

insert into public.pilot_scenarios (
  program_id, title, instructions, scenario_type, expected_category,
  requires_location, requires_live_tracking, requires_attachment,
  requires_notification, requires_resource_download, display_order,
  is_active, created_by, simulated_severity, routing_destination
)
select
  program.id,
  'Academic Fraud & Fake Admin Services',
  'Report people selling paid mark changes, courses or enrolment access, fake sick letters, fake WIL placements, fake academic records or impersonated administrative services. Add factual details and attach screenshots, PDFs, payment requests, usernames, links or other relevant evidence.',
  'standard_report',
  'Fraud',
  false,
  false,
  true,
  true,
  false,
  1,
  true,
  program.created_by,
  'medium',
  'campus_security'
from public.pilot_programs as program
where program.status = 'active'
  and not exists (
    select 1 from public.pilot_scenarios scenario
    where scenario.program_id = program.id
      and scenario.title = 'Academic Fraud & Fake Admin Services'
  );

insert into public.pilot_carousel_slides (
  program_id, title, description, eyebrow, icon_key, image_url, image_alt,
  image_fit, button_label, action_key, display_order, is_active, created_by
)
select
  program.id,
  'Report Academic Fraud & Fake Admin Services',
  'Use the Pilot to report paid mark changes, fake courses, sick letters, WIL placements, academic records or impersonated admin services with private evidence.',
  'Academic integrity and student protection',
  'report',
  null,
  'My CCSF academic fraud reporting guidance',
  'contain',
  'Open reporting',
  'report',
  2,
  true,
  program.created_by
from public.pilot_programs as program
where program.status = 'active'
  and not exists (
    select 1 from public.pilot_carousel_slides slide
    where slide.program_id = program.id
      and slide.title = 'Report Academic Fraud & Fake Admin Services'
  );
