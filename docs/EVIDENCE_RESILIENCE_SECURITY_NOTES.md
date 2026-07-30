# Evidence Resilience Security Notes

- Evidence buckets remain private.
- Browser evidence queues are device-local and expire after 24 hours.
- Server submission drafts expire after 24 hours and are eligible for governed cleanup.
- Evidence upload paths include the authenticated user and short-lived submission UUID.
- Required evidence is verified in private Storage before the visible case is created.
- Checksums support integrity comparison but do not replace access control.
- Signed evidence links are short-lived and issued only after owner, role and campus checks.
- Staff downloads require an operational reason.
- Evidence preview and download events are written to an append-oriented audit table.
- Pilot records remain isolated and never invoke production dispatch or emergency services.
- Offline emergency requests are blocked and explicitly marked as not delivered.
