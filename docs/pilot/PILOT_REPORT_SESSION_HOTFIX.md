# Pilot Report Session Continuity Hotfix

## Defect

Expired Pilot sessions could remain marked `in_progress`. The student portal selected the newest row without checking `expires_at`, so the report form appeared usable but the secure submission service rejected the stale session.

## Correction

- Active Pilot testing sessions use a practical seven-day window.
- Expired sessions are excluded from student context loading.
- Consented and active participants automatically receive a valid session.
- Report submission resolves the current session immediately before sending.
- A stale-session race is retried once with a freshly resolved session.
- Existing authorised in-progress sessions were extended in the live Pilot database.

## Reporting experience

The standard Pilot report form now presents three clear steps: details, location and submit. Evidence and privacy controls remain available in an optional expandable section. The interface clearly states that it is a Pilot feature test and does not dispatch an external emergency service.

## Preserved controls

Campus routing, server-derived ownership, readable location, emergency consent, private evidence, audit records, feature-test telemetry and production-data isolation remain enforced.
