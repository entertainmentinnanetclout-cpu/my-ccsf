-- Do not expose feature switches until their client/API enforcement path exists.
delete from public.feature_flags
where key in ('live_location','evidence_uploads','push_notifications');
