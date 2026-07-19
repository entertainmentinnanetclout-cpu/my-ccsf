# CCSF Phase 6 — Super-Admin Pilot Parity Complete

**Completion date:** 19 July 2026  
**Release-candidate branch:** `feature/ccsf-phases-3-8-release-candidate`  
**Pull request:** #27 — draft and unmerged  
**Production publication:** not authorised

This record closes the authoritative Phase 6 scope from Issue #10.

## Implemented super-admin parity

The generic Pilot administration workspace has been replaced on `/admin/pilot` by a dedicated institutional super-admin console.

The console now provides:

- an official-style premium CCSF/TUT institutional shell;
- Overview, Operations, Campuses, Programmes, Participants, Analytics, Governance and Audit navigation;
- institution-wide realtime Pilot report queues;
- programme, campus, status and text filtering;
- cross-campus triage, controlled lifecycle transitions and super-admin ownership;
- Pilot-only timeline notes and student notifications;
- all-campus scorecards for participants, sessions, reports, active cases and completion rates;
- programme creation, scenario creation and programme lifecycle controls;
- participant search, invitation, controlled removal and invitation restoration;
- cross-campus feature-test, feedback and notification analytics;
- de-identified JSON, identified JSON and de-identified CSV exports;
- retention schedules and confirmed Storage-first expired-data processing;
- programme data-exit controls restricted to completed or archived programmes;
- exact-text confirmation for destructive governance actions;
- structured governance outcomes instead of raw diagnostic JSON;
- searchable cross-campus audit records;
- accessible tab semantics, loading, empty, error, retry and realtime-fallback states;
- a permanent statement that no production case or external emergency dispatch is used.

## Removed or excluded

The Phase 6 user-facing workflow does not expose:

- the generic `PilotAdminWorkspace` or `PilotLiveAdminWorkspace`;
- raw browser prompts or confirmation dialogs;
- raw JSON `<pre>` diagnostics;
- diagnostic-only Edge Function slugs;
- production `AdminOverview`, incidents, escalation, analytics, announcements, staff chat, carousel, campus-admin, Wi-Fi or office components;
- direct reads or writes to production incidents, notifications, case updates or admin logs.

## Automated verification

GitHub Actions run **#495** passed:

- strict `npm ci`;
- Pilot production-isolation verification;
- Phase 3 activation and route verification;
- core product hardening verification;
- Phase 4 Student and Phase 5 Campus-Security parity verification;
- Phase 6 Super-Admin parity verification;
- transparent branding and icon validation;
- official/Pilot student-home parity verification;
- TypeScript type-check;
- ESLint;
- fail-closed production build;
- approved Pilot Preview build.

The permanent Phase 6 gate verifies:

- the dedicated super-admin route and readiness marker;
- eight required administration sections;
- cross-campus Pilot-only data loading and Realtime subscriptions;
- campus/status/search filtering;
- controlled lifecycle, ownership, notes and notifications;
- programme/scenario and participant management;
- exports, retention, programme exit and audit workflows;
- absence of production components, direct production-table access, browser prompts and diagnostic endpoints.

## Live Supabase authority verification

Read-only production verification confirmed:

- programme insert/update policies require super-admin authority;
- participant insert/update policies require super-admin authority;
- report and report-event select policies use the audited Pilot access helper;
- identified exports explicitly deny non-super-admin callers;
- retention planning requires super-admin authority;
- programme cleanup requires super-admin authority and refuses relational finalisation while private Storage cleanup is incomplete;
- `pilot_reports`, `pilot_report_events`, `pilot_notifications` and `pilot_sessions` remain in the Realtime publication;
- no Phase 6 synthetic programme, scenario, participant, session or report residue exists.

The SQL safety layer blocked a second synthetic cross-campus write matrix because it contained retention/cleanup execution. That safeguard was not bypassed. Cross-campus write and denial behaviour remains covered by the completed Phase 3–5 rollback matrices, while Phase 6 authority was revalidated read-only against the live policies and private function guards.

## Advisory state

Supabase security advisers report only the existing project-level warning that leaked-password protection is disabled. This is an Auth dashboard/plan decision and was not introduced by Phase 6. Performance advisers report informational unused-index notices expected before sustained Pilot traffic.

## Release control

Phase 6 authorises Phase 7 work only. It does **not** authorise:

- merging PR #27;
- publishing the release candidate to production;
- enabling external emergency dispatch;
- bypassing Phase 7 institutional/PWA consistency work;
- bypassing Phase 8 end-to-end UAT and explicit approval.
