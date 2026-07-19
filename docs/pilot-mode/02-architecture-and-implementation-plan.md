# Phase 2 — Controlled Pilot Mode Architecture and Implementation Plan

## Status

**COMPLETE — 17 July 2026**

## Purpose

This document defines the approved architecture for a controlled CCSF/CPS Pilot Mode. It is the binding implementation plan for Phases 3–7.

The pilot will run from the existing application and Supabase project, but it will use isolated routes, tables, Storage paths, query keys, Realtime channels, notifications, analytics and deletion functions.

## Core architecture decision

The application will have two explicit operational domains:

```text
Production domain
  existing routes
  existing incident components
  incidents
  incident_media
  incident_location_updates
  notifications
  case_updates
  case_escalations
  production Storage and Edge Functions

Pilot domain
  /pilot
  /security/pilot
  /admin/pilot
  pilot-specific components and services
  pilot_* tables
  pilot-report-attachments bucket
  pilot-only Realtime channels
  pilot-only in-app notifications
  pilot-only Edge Functions and RPCs
```

There will be no automatic fallback from Pilot Mode to production services.

---

## 1. Delivery model

### 1.1 Branch and merge control

All Pilot Mode work remains on:

```text
feature/controlled-pilot-mode
```

The branch will remain unmerged while Phases 3–7 are implemented and tested through Vercel Preview.

The user will approve the final merge only after:

- database implementation;
- application implementation;
- Edge Function implementation;
- preview testing;
- production-isolation testing;
- security validation;
- final documentation.

### 1.2 Deployment environments

Vercel environments will be used as follows:

| Environment | Pilot feature flag | Purpose |
|---|---:|---|
| Branch Preview | `true` | Full controlled pilot testing |
| Production before approval | `false` | Existing production app only |
| Production after merge | Explicit approval | Controlled rollout only |

Required browser variable:

```env
VITE_PILOT_MODE_ENABLED=false
```

The route layer must deny Pilot Mode when the flag is not exactly `true`.

### 1.3 Double gate

Pilot access requires both:

1. frontend feature flag enabled; and
2. an active `pilot_programs` record with an authorised participant or staff user.

A preview URL alone must not grant pilot access.

---

## 2. Route architecture

### 2.1 Student routes

```text
/pilot
/pilot/session/:sessionId
/pilot/report/:reportId
/pilot/resources
```

Responsibilities:

- `/pilot` — programme information, safety warning, eligibility, consent and session start;
- `/pilot/session/:sessionId` — scenario list and controlled test workflow;
- `/pilot/report/:reportId` — simulated status tracking and report timeline;
- `/pilot/resources` — approved safety PDFs and feature-download tests.

All routes require:

- authenticated user;
- `student` role;
- completed profile;
- active participant authorisation;
- matching programme/campus eligibility.

### 2.2 Campus-admin route

```text
/security/pilot
```

This route will reuse the existing CCSF campus-admin visual shell and add a Pilot tab/view without changing branding, colours, typography or production incident screens.

Campus staff may see only pilot records for their assigned campus.

### 2.3 Super-admin route

```text
/admin/pilot
```

This route will reuse the existing super-admin shell and provide cross-campus programme, participant, report, analytics, retention, export and deletion controls.

### 2.4 Redirect behaviour

`AuthContext.redirectBasedOnRole` currently redirects students to `/dashboard`, security users to `/security` and administrators to `/admin`.

It must be updated with explicit approved-path checks:

- student: `/pilot...` is allowed;
- security: `/security/pilot...` is allowed;
- admin: `/admin/pilot...` and `/security/pilot...` are allowed.

No generic bypass based only on the word `pilot` is permitted.

---

## 3. Central mode boundary

### 3.1 `PilotModeProvider`

A new `PilotModeProvider` will expose:

```ts
type AppMode = 'production' | 'pilot';

interface PilotModeContextValue {
  mode: AppMode;
  enabled: boolean;
  program: PilotProgram | null;
  participant: PilotParticipant | null;
  session: PilotSession | null;
  isPilotRoute: boolean;
}
```

The provider derives mode from an approved Pilot route and the feature flag. It does not use a freely editable query parameter as the authoritative mode switch.

### 3.2 Service separation

Approved service boundaries:

```text
src/services/production/*
src/services/pilot/*
```

Pilot components may import only from `src/services/pilot` for pilot data operations.

Production components must never import pilot services.

Pilot services must never reference:

- `incidents`;
- `incident_media`;
- `incident_location_updates`;
- production `notifications`;
- `case_updates`;
- `case_escalations`;
- `incident-media` Storage;
- `send-push-notification`.

### 3.3 Query keys

Production keys remain unchanged.

Pilot keys use a separate namespace:

```ts
['pilot', 'programs']
['pilot', 'participant', userId]
['pilot', 'session', sessionId]
['pilot', 'reports', filters]
['pilot', 'report', reportId]
['pilot', 'events', reportId]
['pilot', 'notifications', userId]
['pilot', 'analytics', programId, campus]
```

No pilot query may use the key `incidents`.

---

## 4. Pilot programme model

### 4.1 Programme lifecycle

```text
draft → active → paused → completed → archived
```

Only `active` programmes accept new sessions and reports.

Paused programmes allow existing records to be reviewed but block new submissions.

Completed programmes allow reporting and export but not new sessions.

Archived programmes are read-only pending retention purge.

### 4.2 Participation model

The pilot reuses existing Supabase Auth users and existing roles.

It does not create anonymous pilot accounts.

Students must be allowlisted through `pilot_participants` before entering the pilot.

This provides:

- controlled cohort size;
- verified campus association;
- consent traceability;
- withdrawal support;
- reliable RLS ownership.

### 4.3 Scenarios

Super admins configure controlled scenarios in `pilot_scenarios`.

Examples:

- standard incident report;
- emergency-button simulation;
- location permission and accuracy test;
- attachment upload test;
- simulated status notification test;
- safety PDF download test;
- end-to-end report tracking test.

A scenario may require specific features without dispatching any real emergency response.

---

## 5. Student pilot journey

### Step 1 — Entry

The student opens `/pilot` from the Vercel Preview deployment or an approved pilot invitation.

The system confirms:

- feature flag;
- authentication;
- student role;
- profile completion;
- active programme;
- participant authorisation;
- campus eligibility.

### Step 2 — Safety warning

A persistent warning is displayed:

> Demo Mode: No emergency service has been dispatched. For an actual emergency, contact CPS immediately using institutionally verified contact details.

The warning must appear on:

- pilot landing;
- report form;
- emergency simulation;
- tracking screen;
- completion screen.

### Step 3 — Consent

The participant accepts:

- pilot purpose;
- temporary data collection;
- location and attachment permissions where applicable;
- no-real-dispatch notice;
- retention period;
- withdrawal/deletion process.

Consent creates or updates the participant record and starts a session.

### Step 4 — Scenario execution

The participant completes one or more configured scenarios.

The visual sequence should mirror the production student flow, but all submissions use pilot services and pilot tables.

### Step 5 — Simulated report

The pilot generates a reference number such as:

```text
PILOT-2026-PW-000123
```

The report status sequence is:

```text
Received
Assessing
Assigned
In Progress
Simulation Completed
```

Optional terminal states:

```text
Cancelled
Withdrawn
Expired
```

### Step 6 — Tracking and notification

The participant sees:

- pilot reference number;
- simulated timeline;
- in-app pilot notifications;
- clear simulation labels;
- no production case number.

### Step 7 — Feedback and completion

The session records:

- feature success/failure;
- usability rating;
- confidence rating;
- free-text feedback;
- completion or abandonment reason.

---

## 6. Incident form architecture

### 6.1 Shared presentation, separate controller

The current `ReportIncident` component combines presentation, geolocation, insert logic and Storage upload.

Phase 4 will separate reusable presentation from submission control:

```text
IncidentFormFields / IncidentFormShell
  shared field rendering and validation

ProductionReportController
  existing incidents + incident-media behaviour

PilotReportController
  pilot_reports + pilot-report-attachments behaviour
```

The production user experience must remain visually and behaviourally unchanged.

### 6.2 Emergency simulation

The production `EmergencyReport` component must not be mounted inside Pilot Mode.

Pilot Mode uses a dedicated `PilotEmergencySimulation` component that:

- displays the same visual urgency;
- requires explicit simulation confirmation;
- creates a `pilot_reports` record;
- may start pilot-only location capture;
- never invokes production live tracking;
- never writes to `incidents`;
- never triggers push, SMS, email or dispatch.

### 6.3 Location capture

Pilot location capture uses a dedicated hook and table.

It must use a separate browser storage key:

```text
pilot_location_tracking
```

It must not use:

```text
emergency_tracking
```

The pilot may test:

- permission granted/denied;
- first-fix latency;
- coordinate accuracy;
- periodic updates;
- tracking stop/resume;
- participant cancellation.

---

## 7. Campus pilot dashboard

The campus dashboard is scoped to `userProfile.campus` through RLS and frontend filtering.

### Required views

- Overview
- Pilot Reports
- Active Simulations
- Participants
- Feature Results
- Feedback
- Export
- Data Management

### Required KPIs

- invited participants;
- consented participants;
- active/completed sessions;
- report completion rate;
- abandonment rate;
- median submission time;
- location permission success;
- attachment upload success;
- notification read rate;
- average usability score;
- reports by scenario and status.

### Campus permissions

Campus security staff may:

- read pilot records for their campus;
- move simulated reports through approved statuses;
- add pilot timeline notes;
- send pilot-only in-app notifications;
- export campus pilot results;
- delete one campus pilot report through an audited function.

Bulk campus purge requires a campus head or super admin.

Campus staff may not:

- access another campus;
- modify programme configuration;
- create a super-admin programme;
- invoke production incident actions;
- invoke production push/dispatch integrations.

---

## 8. Super-admin pilot dashboard

### Required views

- Programme Overview
- Programme Configuration
- Scenarios
- Participants
- Reports
- Campus Comparison
- Feature Analytics
- Feedback
- Exports
- Retention and Purge
- Audit Log

### Super-admin permissions

Super admins may:

- create and manage programmes;
- set eligible campuses;
- configure scenarios;
- invite/remove participants;
- view all pilot data;
- manage simulated status transitions;
- export de-identified or identified results according to purpose;
- delete reports/sessions;
- purge a campus or programme;
- run retention cleanup;
- archive a programme.

All destructive actions require:

- explicit confirmation;
- reason;
- actor ID;
- affected record count;
- audit record.

---

## 9. Notification architecture

Pilot notifications are in-app only.

They are stored in `pilot_notifications` and delivered through a pilot Realtime subscription.

Pilot code must not invoke:

```text
send-push-notification
```

Supported pilot notification types:

- report received;
- status changed;
- simulation assigned;
- simulation completed;
- action required;
- session expiring;
- programme message.

The UI must label every notification as `Pilot` or `Simulation`.

---

## 10. Realtime architecture

Approved channel namespaces:

```text
pilot-report-{reportId}
pilot-session-{sessionId}
pilot-campus-{campus}
pilot-program-{programId}
```

Subscriptions listen only to pilot tables.

Production `incidents` and production notification subscriptions remain unchanged.

---

## 11. Analytics architecture

Pilot analytics are computed only from pilot tables.

### Event catalogue

- `pilot_landing_viewed`
- `pilot_consent_viewed`
- `pilot_consent_accepted`
- `pilot_consent_declined`
- `pilot_session_started`
- `pilot_scenario_started`
- `pilot_location_requested`
- `pilot_location_granted`
- `pilot_location_denied`
- `pilot_attachment_selected`
- `pilot_attachment_uploaded`
- `pilot_attachment_failed`
- `pilot_report_submitted`
- `pilot_status_viewed`
- `pilot_notification_read`
- `pilot_resource_downloaded`
- `pilot_feedback_submitted`
- `pilot_session_completed`
- `pilot_session_abandoned`
- `pilot_error`

### Privacy rule

Analytics metadata must not duplicate report descriptions, attachments, precise medical information or unnecessary personal identifiers.

---

## 12. Edge Function architecture

Pilot Edge Functions will be implemented under separate slugs:

```text
pilot-create-session
pilot-submit-report
pilot-transition-status
pilot-create-notification
pilot-delete-report
pilot-delete-session
pilot-purge-data
pilot-export-results
```

All functions require platform JWT verification.

Functions must validate:

- authenticated caller;
- user role;
- participant/session ownership;
- campus scope;
- programme status;
- allowed state transition;
- destructive-action authority.

No pilot function may call a production Edge Function.

---

## 13. Phase sequence

### Phase 3 — Database and SQL

- create pilot enums and tables;
- create indexes and constraints;
- enable RLS;
- create private Storage bucket and policies;
- create deletion, retention and export functions;
- configure Realtime tables;
- regenerate types;
- create rollback documentation.

### Phase 4 — Frontend

- add routes and feature flag;
- add mode provider and guards;
- add student journey;
- add pilot report and emergency simulation;
- add tracking, resources and feedback;
- add campus and super-admin dashboards;
- add deletion/export UI.

### Phase 5 — Edge Functions

- implement and deploy the approved pilot-only functions;
- validate JWT, role and campus controls;
- document required environment variables.

### Phase 6 — QA

- production isolation;
- RLS ownership and campus scope;
- destructive actions;
- no-real-dispatch verification;
- mobile/browser/location/attachment testing;
- build, lint and type checks;
- Vercel Preview testing.

### Phase 7 — Delivery

- final migration and deployment register;
- QA evidence;
- accepted limitations;
- rollback guide;
- final pull-request review;
- user-controlled merge to `main`.

---

## 14. Non-negotiable acceptance criteria

Pilot Mode is acceptable only if:

1. A pilot report cannot appear in a production incident query.
2. A pilot attachment cannot be stored in a production bucket.
3. Pilot tracking cannot update `incidents` or `incident_location_updates`.
4. Pilot notifications cannot invoke production push delivery.
5. Campus staff cannot read another campus's pilot data.
6. Students can read only their own pilot records.
7. Every destructive action is role-checked and audited.
8. Pilot routes are unavailable when the feature flag is disabled.
9. The production application still builds and behaves as before.
10. The branch remains unmerged until the user completes preview testing and approves the merge.
