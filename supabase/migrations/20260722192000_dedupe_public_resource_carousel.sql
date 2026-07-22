-- Keep one active public document-library card per programme/global scope.

with ranked as (
  select
    id,
    row_number() over (
      partition by coalesce(program_id::text, 'global'), action_key
      order by display_order asc, created_at asc, id asc
    ) as position
  from public.pilot_carousel_slides
  where action_key = 'resources'
    and is_active = true
)
update public.pilot_carousel_slides as slide
set is_active = false,
    updated_at = now()
from ranked
where slide.id = ranked.id
  and ranked.position > 1;
