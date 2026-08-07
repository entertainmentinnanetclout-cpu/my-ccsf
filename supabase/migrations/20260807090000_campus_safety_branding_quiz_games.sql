-- Campus Safety App naming and Community Safety Games alignment
-- User-facing campus name changes only; existing enum/internal routing keys remain unchanged.

update public.tournaments
set
  campus = 'pretoria_campus',
  venue = case
    when venue = 'TUT Pretoria West Sports Grounds' then 'TUT Pretoria Campus Sports Grounds'
    when venue = 'TUT Pretoria West Netball Courts' then 'TUT Pretoria Campus Netball Courts'
    else replace(coalesce(venue, ''), 'Pretoria West', 'Pretoria Campus')
  end,
  updated_at = now()
where id in (
  'official-soccer-2026',
  'official-netball-2026',
  'pilot-soccer-2026',
  'pilot-netball-2026'
);

insert into public.community_games (
  id,
  environment,
  title,
  game_type,
  description,
  campus,
  difficulty,
  estimated_minutes,
  participant_mode,
  points,
  safety_notice,
  rules,
  is_active,
  updated_at
)
values
  ('safety-treasure-hunt-official','official','Community Safety Treasure Hunt','safety_treasure_hunt','Find approved campus safety locations and learn what each service is used for.','pretoria_campus','medium',25,'individual_or_team',0,'Use only approved public campus areas and follow normal campus safety rules.','{"focus":"campus safety locations","status":"coming_soon"}'::jsonb,false,now()),
  ('spot-safety-building-official','official','Spot the Safety Building','spot_safety_building','Identify key Pretoria Campus safety and administration buildings from visual clues.','pretoria_campus','easy',15,'individual',0,'Do not enter restricted areas while completing building challenges.','{"focus":"building recognition","status":"coming_soon"}'::jsonb,false,now()),
  ('cps-service-match-official','official','CPS Service Match','cps_service_match','Match Control Room, Traffic Services, Investigation, Fire and Emergency Services, and Events Compliance & Crime Prevention to the correct matter.','pretoria_campus','medium',15,'individual',0,'Use the Campus Safety App or official CPS routes for real incidents.','{"focus":"service routing","status":"coming_soon"}'::jsonb,false,now()),
  ('reporting-route-race-official','official','Reporting Route Challenge','reporting_route_challenge','Race through safety scenarios by choosing the correct reporting route and CPS service.','pretoria_campus','medium',20,'individual_or_team',0,'Game scenarios are educational and do not replace real incident reporting.','{"focus":"reporting routes","status":"coming_soon"}'::jsonb,false,now()),
  ('fire-safety-scenario-official','official','Fire Safety Scenario Challenge','fire_safety_scenario','Practice identifying when Fire and Emergency Services is the correct specialist route.','pretoria_campus','medium',15,'individual',0,'For a real fire incident, use official emergency and CPS reporting procedures immediately.','{"focus":"fire and emergency services","status":"coming_soon"}'::jsonb,false,now()),
  ('crime-prevention-challenge-official','official','Crime Prevention Challenge','crime_prevention_challenge','Interactive event-compliance and crime-prevention planning scenarios for student engagement.','pretoria_campus','medium',20,'team',0,'Activities are awareness-focused and do not authorise confrontation, detention or investigation.','{"focus":"events compliance and crime prevention","status":"coming_soon"}'::jsonb,false,now()),

  ('safety-treasure-hunt-pilot','pilot','Community Safety Treasure Hunt','safety_treasure_hunt','Find approved campus safety locations and learn what each service is used for.','pretoria_campus','medium',25,'individual_or_team',0,'Use only approved public campus areas and follow normal campus safety rules.','{"focus":"campus safety locations","status":"coming_soon"}'::jsonb,false,now()),
  ('spot-safety-building-pilot','pilot','Spot the Safety Building','spot_safety_building','Identify key Pretoria Campus safety and administration buildings from visual clues.','pretoria_campus','easy',15,'individual',0,'Do not enter restricted areas while completing building challenges.','{"focus":"building recognition","status":"coming_soon"}'::jsonb,false,now()),
  ('cps-service-match-pilot','pilot','CPS Service Match','cps_service_match','Match Control Room, Traffic Services, Investigation, Fire and Emergency Services, and Events Compliance & Crime Prevention to the correct matter.','pretoria_campus','medium',15,'individual',0,'Use the Campus Safety App or official CPS routes for real incidents.','{"focus":"service routing","status":"coming_soon"}'::jsonb,false,now()),
  ('reporting-route-race-pilot','pilot','Reporting Route Challenge','reporting_route_challenge','Race through safety scenarios by choosing the correct reporting route and CPS service.','pretoria_campus','medium',20,'individual_or_team',0,'Game scenarios are educational and do not replace real incident reporting.','{"focus":"reporting routes","status":"coming_soon"}'::jsonb,false,now()),
  ('fire-safety-scenario-pilot','pilot','Fire Safety Scenario Challenge','fire_safety_scenario','Practice identifying when Fire and Emergency Services is the correct specialist route.','pretoria_campus','medium',15,'individual',0,'For a real fire incident, use official emergency and CPS reporting procedures immediately.','{"focus":"fire and emergency services","status":"coming_soon"}'::jsonb,false,now()),
  ('crime-prevention-challenge-pilot','pilot','Crime Prevention Challenge','crime_prevention_challenge','Interactive event-compliance and crime-prevention planning scenarios for student engagement.','pretoria_campus','medium',20,'team',0,'Activities are awareness-focused and do not authorise confrontation, detention or investigation.','{"focus":"events compliance and crime prevention","status":"coming_soon"}'::jsonb,false,now())
on conflict (id) do update set
  title = excluded.title,
  game_type = excluded.game_type,
  description = excluded.description,
  campus = excluded.campus,
  difficulty = excluded.difficulty,
  estimated_minutes = excluded.estimated_minutes,
  participant_mode = excluded.participant_mode,
  points = excluded.points,
  safety_notice = excluded.safety_notice,
  rules = excluded.rules,
  is_active = excluded.is_active,
  updated_at = now();
