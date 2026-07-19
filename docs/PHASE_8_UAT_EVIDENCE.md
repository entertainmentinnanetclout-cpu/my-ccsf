# CCSF Phase 8 — End-to-End UAT Evidence

**Execution date:** 19 July 2026  
**Environment:** protected Vercel release-candidate Preview and Supabase project `lfelzsubrlqwcsnetpov`  
**Branch:** `feature/ccsf-phases-3-8-release-candidate`  
**Pull request:** #27 — draft and unmerged

## Test method

The release gate combines:

- permanent repository assertions executed by GitHub Actions;
- live Supabase schema, RLS, function, Storage and Realtime inspection;
- authenticated-role simulation using transaction-local JWT claims;
- rollback-only end-to-end fixtures;
- protected Preview route, metadata, manifest and service-worker smoke checks;
- TypeScript, ESLint and separate production/Pilot builds.

No real user password was read or stored for UAT. Database fixtures were created only inside transactions and rolled back.

An initial composite SQL harness changed several simulated JWT identities inside one PL/pgSQL statement. PostgreSQL stable-function evaluation made that harness unsuitable for role switching. The corrected UAT used separate statements and transaction-local claims, matching the application request boundary. The corrected matrices passed.

## Student → campus-security → super-admin lifecycle

| Test | Result | Evidence |
|---|---|---|
| Student accepts active Pilot invitation | PASS | Consent RPC accepted the invited participant. |
| Student creates isolated Pilot session | PASS | Session insert passed authenticated student RLS. |
| Student submits end-to-end report | PASS | Report entered `received` with a generated `PIL-*` reference. |
| Initial timeline and notification | PASS | `report_created` event and `report_received` notification created automatically. |
| Same-campus queue visibility | PASS | Pretoria West campus-security role saw one authorised report. |
| Cross-campus queue isolation | PASS | Mbombela campus-security role saw zero Pretoria West reports. |
| Campus processing | PASS | `received → assessing → assigned → in_progress → simulation_completed`. |
| Authenticated assignment | PASS | Campus staff accepted the case using their verified profile; no raw UUID input. |
| Timeline note | PASS | Campus note added to `pilot_report_events`. |
| Student update | PASS | Case-linked Pilot notification created. |
| Super-admin visibility | PASS | Super-admin saw the completed cross-campus record. |
| Student status notifications | PASS | Six lifecycle notifications were visible to the report owner. |
| Notification read receipt | PASS | Owner-only read state and `read_at` update succeeded. |
| Realtime source coverage | PASS | Seven report timeline events were available to published Realtime sources. |

## Evidence and location

| Test | Result | Evidence |
|---|---|---|
| Initial location fix | PASS | Owned `initial_fix` event accepted. |
| Live location tracking | PASS | Owned `live_tracking` event accepted. |
| Cross-user location injection | PASS — denied | Validator rejected a different student writing to the report. |
| Valid evidence metadata | PASS | Correct private Storage path, MIME and size accepted. |
| Invalid evidence path | PASS — denied | Rejected with `Invalid pilot attachment storage path`. |
| Evidence file limit | PASS — denied | Fourth file rejected with `Maximum three attachments per pilot report`. |
| Feature telemetry | PASS | Location, tracking, attachment and notification outcomes recorded. |
| Pilot feedback | PASS | Ratings and controlled UAT comments accepted. |

The private `pilot-report-attachments` bucket was verified as non-public with a 10 MB per-file limit. Allowed types are JPEG, PNG, WebP, MP4 and PDF. Storage INSERT policy requires the canonical programme/campus/user/report path and report ownership. Storage SELECT policy requires authorised report access.

## Cross-role and cross-campus authorisation

| Test | Result |
|---|---|
| Student attempts staff lifecycle transition | PASS — denied |
| Student attempts programme export | PASS — denied |
| Cross-campus security reads report | PASS — denied |
| Cross-campus security transitions report | PASS — denied |
| Same-campus security reads report | PASS |
| Campus de-identified export | PASS |
| Campus identified export | PASS — denied |
| Campus requests another campus export | PASS — denied |
| Super-admin reads cross-campus report | PASS |
| Super-admin de-identified export masks title/reference | PASS |
| Super-admin identified export contains authorised fields | PASS |
| Export operations create audit entries | PASS |

## Assignment parity correction

Phase 8 found and corrected an actual user-facing mismatch:

- the campus Pilot portal previously required a raw officer profile UUID;
- the super-admin UI allowed authenticated triage ownership, while the database function accepted only a security-role assignee.

The correction:

- replaces raw UUID entry with `Assign to me` using the authenticated staff profile;
- permits same-campus security self-assignment;
- permits a super-admin to assign only their own authenticated admin profile;
- prevents campus security from assigning an admin;
- preserves legal lifecycle sequencing, campus isolation and all no-dispatch notifications.

Rollback matrices confirmed both authenticated campus-security self-assignment and authenticated super-admin self-assignment.

## Production isolation

A dynamic before/after transaction baseline confirmed:

- Pilot session and report counts increased only inside the UAT transaction;
- production `incidents` did not change;
- production `notifications` did not change;
- production `case_updates` did not change;
- the transaction was rolled back.

Post-test residue verification confirmed:

- participant status restored to `invited`;
- zero UAT Pilot sessions;
- zero UAT Pilot reports;
- zero UAT attachment metadata rows;
- zero UAT location events;
- zero UAT Pilot notifications;
- zero UAT report events;
- zero UAT feature-test rows;
- zero UAT feedback rows;
- zero UAT audit rows.

## Realtime and service boundary

Supabase Realtime publication includes:

- `pilot_sessions`;
- `pilot_reports`;
- `pilot_report_events`;
- `pilot_notifications`.

All deployed Pilot Edge Functions required JWT verification and were active during verification, including session creation, report submission, status transition, notification, export and controlled cleanup functions.

Every Pilot report receipt and status message retains the explicit statement that no emergency service was dispatched.

## Browser, responsive and institutional checks

The permanent Phase 8 release gate verifies:

- direct routes for official and Pilot authentication, student, campus-security and super-admin portals;
- protected-route redirection and role-safe deep links;
- official and Pilot headers, footers and no-dispatch banners;
- separate TUT light/dark logos and the canonical transparent CCSF logo;
- ThemeToggle coverage and dark-mode hierarchy;
- safe-area-aware mobile navigation with no five-item truncation;
- reduced-motion splash behavior;
- institutional PWA metadata, icons, manifest shortcuts and controlled stale-cache replacement;
- no production workflow imports or production table access from Pilot components/services.

The final Preview smoke record and final GitHub Actions run are recorded in `PHASE_8_COMPLETE.md` after the release-candidate head is verified.
