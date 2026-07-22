-- Some prevention reports, including online academic fraud, do not need a live location.
-- Scenario configuration and the secured Edge function remain authoritative.

alter table public.pilot_reports
  drop constraint if exists pilot_reports_coordinates_required;

alter table public.pilot_reports
  drop constraint if exists pilot_reports_readable_location_required;

alter table public.pilot_reports
  add constraint pilot_reports_coordinate_pair_integrity
  check (
    (location_lat is null and location_lng is null)
    or (location_lat is not null and location_lng is not null)
  );

alter table public.pilot_reports
  add constraint pilot_reports_location_description_integrity
  check (
    location_lat is null
    or nullif(btrim(location_description), '') is not null
  );
