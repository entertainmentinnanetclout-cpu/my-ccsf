revoke select, insert, update, delete, truncate, references, trigger on table public.pilot_programs from authenticated;
revoke select, insert, update, delete, truncate, references, trigger on table public.pilot_scenarios from authenticated;
revoke select, insert, update, delete, truncate, references, trigger on table public.pilot_participants from authenticated;
revoke select, insert, update, delete, truncate, references, trigger on table public.pilot_sessions from authenticated;
revoke select, insert, update, delete, truncate, references, trigger on table public.pilot_reports from authenticated;
revoke select, insert, update, delete, truncate, references, trigger on table public.pilot_report_events from authenticated;
revoke select, insert, update, delete, truncate, references, trigger on table public.pilot_location_events from authenticated;
revoke select, insert, update, delete, truncate, references, trigger on table public.pilot_attachments from authenticated;
revoke select, insert, update, delete, truncate, references, trigger on table public.pilot_notifications from authenticated;
revoke select, insert, update, delete, truncate, references, trigger on table public.pilot_feature_tests from authenticated;
revoke select, insert, update, delete, truncate, references, trigger on table public.pilot_feedback from authenticated;
revoke select, insert, update, delete, truncate, references, trigger on table public.pilot_audit_logs from authenticated;

grant select on table public.pilot_programs, public.pilot_scenarios, public.pilot_participants, public.pilot_sessions, public.pilot_reports, public.pilot_report_events, public.pilot_location_events, public.pilot_attachments, public.pilot_notifications, public.pilot_feature_tests, public.pilot_feedback, public.pilot_audit_logs to authenticated;
grant insert, update on table public.pilot_programs, public.pilot_scenarios, public.pilot_participants, public.pilot_sessions to authenticated;
grant insert on table public.pilot_reports, public.pilot_location_events, public.pilot_attachments, public.pilot_feature_tests to authenticated;
grant insert, update on table public.pilot_feedback to authenticated;
grant update on table public.pilot_notifications to authenticated;