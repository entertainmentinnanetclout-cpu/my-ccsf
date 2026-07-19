# CCSF Phases 4 and 5 — Complete

**Completion date:** 19 July 2026  
**Release-candidate branch:** `feature/ccsf-phases-3-8-release-candidate`  
**Merge status:** intentionally unmerged  
**Production publication:** not authorised

This record closes the authoritative Phase 4 and Phase 5 scope from Issue #10.

## Phase 4 — Student Pilot parity

Completed:

- aligned the Student Pilot navigation with the official student portal: Home, My Cases, Report, Map and Support;
- retained the shared official student-home carousel, welcome content, campus news and responsive layout;
- implemented Pilot-only standard reporting and emergency simulation workflows;
- retained isolated evidence attachment, GPS location and case-tracking flows;
- added an always-available emergency simulation entry point with explicit no-dispatch messaging;
- replaced generic messages with a functional Pilot Support Centre and realtime staff notifications;
- added notification rollback handling, loading/error/retry states, keyboard focus and accessible tab/log semantics;
- retained permanent programme access without requiring manual programme activation on every visit;
- confirmed student ownership and cross-student/cross-campus isolation through live RLS tests;
- confirmed that no production `incidents`, `notifications`, `case_updates` or incident-media workflow is reused.

## Phase 5 — Campus-security Pilot parity

Completed:

- introduced a dedicated campus-security Pilot dashboard rather than reusing the generic super-admin workspace;
- matched the official campus portal information architecture: Overview, Incidents, Analytics, Students, Updates and Communications;
- implemented campus-scoped realtime queues for Pilot reports, events, notifications, participants, sessions and feature tests;
- added controlled report lifecycle progression from Received through Assessment, Assignment, Response and Simulation Complete;
- added explicit officer assignment, timeline notes and case-linked student notifications;
- added campus queue search and status filtering;
- added campus participant visibility, session/report counts, operational metrics and feature-test analytics;
- added realtime failure messaging with a 15-second fallback refresh;
- failed closed when a campus-security profile has no verified campus;
- confirmed campus RLS isolation and denial of cross-campus transitions;
- confirmed that no production incidents, case updates, staff chat, announcements, analytics or Wi-Fi management component is reused.

## Core product and media hardening retained

The release candidate also contains the Phase 4 release-blocking hardening completed before the parity split was reconciled with Issue #10:

- recoverable application error boundary and online/offline state;
- verified student support routing instead of mock chatbot case responses;
- failure-aware notifications, case timelines, incident evidence and official emergency contacts;
- staff-chat persistence and removal of unsupported call/video/settings controls;
- carousel Storage cleanup, mobile/touch controls and failure states;
- campus-scoped judiciary data;
- transparent canonical CCSF logo and correctly sized browser/PWA assets;
- permanent CI checks for alpha transparency, optical footprint and native icon dimensions.

## Supabase migrations

Applied to the live project and committed to the release candidate:

- `20260719193525_phase_4_production_realtime_and_evidence_limit.sql`
- `20260719193858_phase_4_scope_carousel_management.sql`
- `20260719194022_phase_4_scope_media_storage_paths.sql`

The migrations align Realtime subscriptions, evidence limits, carousel administration and Storage paths with the actual clients while preserving RLS and campus scope.

## Live rollback-only verification

A transactional role matrix passed **15/15 assertions**:

1. student can read their own Pilot report;
2. student cannot read another campus's Pilot report;
3. campus security can read its own-campus Pilot queue;
4. campus security cannot read another campus's Pilot queue;
5. report lifecycle reaches `in_progress` through authorised transitions;
6. officer assignment persists;
7. campus timeline note persists;
8. cross-campus lifecycle transition is denied;
9. student receives a campus staff Pilot notification;
10. student can mark their own notification read;
11. required Pilot tables are in the Realtime publication;
12. chat room member can upload to the `room/user/file` path;
13. non-member chat-media upload is denied;
14. campus security can upload carousel media for its own campus;
15. cross-campus carousel-media upload is denied.

The transaction was rolled back. A residue check confirmed **zero** test reports, chat rooms, notifications, Storage objects or temporary consent markers.

## Automated verification

GitHub Actions run **#483** passed:

- strict `npm ci`;
- Pilot production-isolation gate;
- Phase 3 activation and route gate;
- core product hardening gate;
- Phase 4 Student and Phase 5 Campus-Security parity gate;
- transparent branding and icon-dimension gate;
- official/Pilot student-home parity gate;
- TypeScript type-check;
- ESLint;
- fail-closed production build;
- approved Pilot Preview build.

## Accepted advisory state

Supabase security advisers report no new database security findings. The only remaining warning is the project-level Auth setting for leaked-password protection, which requires a dashboard configuration decision and is not caused by these phases. Performance advisers report informational unused-index notices expected before sustained Pilot traffic.

## Release control

Phases 4 and 5 authorise work on Phase 6 only. They do **not** authorise:

- merging the draft release candidate;
- deploying these changes to production;
- enabling real external emergency dispatch;
- bypassing the Phase 8 UAT and explicit approval gate.
