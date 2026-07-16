# Phase 1 — Security and Operational Risk Register

## Rating model

- **Critical:** could create real-world emergency, privacy, authorization or production-data harm
- **High:** likely to contaminate operations, expose data or cause material service failure
- **Medium:** requires correction before broad pilot use
- **Low:** hygiene or maintainability concern

## Risks

| ID | Risk | Severity | Evidence / cause | Required treatment |
|---|---|---:|---|---|
| R-01 | Pilot report enters production incident queue | Critical | Student report and emergency components insert directly into `incidents`; many dashboards and Realtime channels consume it | Separate `pilot_reports`; central service boundary; tests proving no production write |
| R-02 | Demo emergency creates real production alert | Critical | `EmergencyReport` inserts a production incident and starts tracking | Replace with pilot-only emergency simulation; clear warning; disable all live dispatch paths |
| R-03 | Pilot location writes continue after demo | Critical | Tracking resumes from `localStorage` and updates production every 30 seconds | Separate pilot key, hook and tables; explicit expiry and stop control |
| R-04 | Pilot status update creates production notification | Critical | DB trigger inserts notifications after incident status/assignment change | Never update production incidents in Pilot Mode; pilot event and notification tables |
| R-05 | Future SAPS integration receives pilot case | Critical | Escalation structure already exists and is described as API-ready | Pilot services must not call production escalation code; add no-real-dispatch test and server checks |
| R-06 | Campus officer sees another campus's data | Critical | Several frontend queries are broad and depend on RLS | Strict pilot RLS using campus identity; server-side campus validation; cross-campus tests |
| R-07 | Repository RLS differs from live Supabase | High | Multiple migrations replace policies; live state not connected | Export/inspect live policies manually before SQL execution; document final effective policies |
| R-08 | Pilot and production React Query caches mix | High | Production key is `incidents` | Dedicated pilot query keys and service modules |
| R-09 | Global MasterSync consumes pilot data | High | Consolidated production context listens to core tables | Never use production tables; do not add pilot tables to production context |
| R-10 | Pilot route is overridden by role redirect | High | `AuthContext` redirects by role | Explicit allowed pilot paths in redirect logic; route tests for all roles |
| R-11 | Sensitive profile data copied into demo reports | High | Emergency description includes medical and emergency-contact details | Pilot reports collect minimum data; no sensitive profile copying; consent and retention controls |
| R-12 | Exact location retained longer than needed | High | Production tracking stores history; no retention UI found | Pilot location expiry, reduced precision where possible, retention purge and consent text |
| R-13 | Attachments remain after report deletion | High | Existing storage deletion is incomplete | Private pilot bucket; RPC cascade cleanup; retention job; object-delete verification |
| R-14 | Incident media cannot be displayed or is exposed incorrectly | High | path stored as `media_url`, modal renders as direct URL | Pilot attachments use private paths and signed URLs; verify production separately |
| R-15 | Pilot admin deletion is implemented client-side across tables | High | no central production cascade pattern | Role-checked database RPCs with transaction and audit record |
| R-16 | Emergency contact information is inconsistent | High | hard-coded numbers differ across `StudentChat`, `EmergencyReport`, `CampusMap` | Central emergency-contact configuration; replace outdated hard-coded numbers before launch |
| R-17 | Student mistakes demo for live emergency reporting | High | real UI patterns and emergency language | Persistent pilot banner, confirmation warning, blocked live dispatch and actual emergency instructions |
| R-18 | Anonymous pilot session can access another session | High | anonymous mode not yet designed | signed session token or authenticated access; strict session ownership RLS |
| R-19 | Service-role function is invoked by unauthorized user | High | Edge Functions use service role after caller checks | Reuse strict auth/role validation; test missing, forged and expired tokens |
| R-20 | Push function reports success without sending | Medium | current function increments success without transport call | Pilot uses in-app notifications; production push listed as incomplete, not relied upon |
| R-21 | Recovery function claims email delivery without proof | Medium | `generateLink` used; response wording implies email received | Correct messaging or implement verified delivery separately |
| R-22 | Hard-coded Supabase configuration complicates environment control | Medium | URL and anon key in browser source | move to Vite environment variables; validate build-time configuration |
| R-23 | Generated schema is stale | Medium | `app_settings` queried but absent from types | regenerate types after approved SQL; live schema comparison |
| R-24 | No automated test command | Medium | package scripts lack test runner | add targeted tests or scripted isolation checks before pilot approval |
| R-25 | Broad CORS on Edge Functions | Medium | current functions use `Access-Control-Allow-Origin: *` | evaluate allowed origins; retain auth checks; restrict where operationally possible |
| R-26 | Public content Storage objects become orphaned | Medium | carousel row deletion does not delete object; avatars retain old files | cleanup utilities and lifecycle policy; separate from pilot attachment design |
| R-27 | Student chat presents itself as AI but is local rules only | Medium | `StudentChat` is hard-coded and disconnected | label accurately; centralize contacts; do not treat as operational response channel |
| R-28 | Background incident sync appears supported but is empty | Medium | service worker contains placeholder `syncPendingIncidents` | do not claim offline report delivery; explicitly disable or implement/test later |
| R-29 | Campus map phone numbers are not CPS emergency-hotline source of truth | Medium | hard-coded campus phone map | central contact registry and official emergency labels |
| R-30 | Client-side metrics can disagree with source data | Low | several portals calculate counts after fetch | pilot analytics should use controlled views/RPCs for consistent metrics |
| R-31 | `typing_indicators` table is unused | Low | current chat uses Presence | exclude from pilot architecture unless a defined need exists |
| R-32 | `accredited_residences` is unused in current frontend | Low | schema/migration only in code search | keep outside pilot scope |

## Mandatory Phase 2 controls

1. Confirm separate `pilot_*` data model.
2. Define one central Pilot Mode provider and service factory.
3. Prevent direct imports of production incident mutations in pilot components.
4. Define private pilot attachment storage and signed access.
5. Define server-side deletion and retention RPCs.
6. Define campus and user ownership policies.
7. Define persistent demo disclosure and real-emergency instructions.
8. Define separate location state and Realtime channels.
9. Centralize CPS hotline information.
10. Define an explicit no-dispatch contract in frontend, database and Edge Functions.
11. Require manual live-Supabase policy verification before migration execution.
12. Add isolation tests before any pilot activation.

## Phase 1 risk conclusion

The highest risk is not database size. It is accidental activation or contamination of the production incident ecosystem. The separate-table architecture is required to reduce this risk to an acceptable level.
