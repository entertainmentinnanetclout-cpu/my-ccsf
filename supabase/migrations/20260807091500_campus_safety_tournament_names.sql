-- Align live tournament names with Campus Safety App branding.

update public.tournaments
set
  name = case id
    when 'official-soccer-2026' then 'Campus Safety App Soccer Tournament'
    when 'official-netball-2026' then 'Campus Safety App Netball Tournament'
    when 'pilot-soccer-2026' then 'Campus Safety App Pilot Soccer Tournament'
    when 'pilot-netball-2026' then 'Campus Safety App Pilot Netball Tournament'
    else name
  end,
  updated_at = now()
where id in (
  'official-soccer-2026',
  'official-netball-2026',
  'pilot-soccer-2026',
  'pilot-netball-2026'
);
