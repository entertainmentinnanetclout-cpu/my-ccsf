# Phase 2A — Pilot Data, Security and Retention Contract

## Status

**APPROVED FOR PHASE 3 IMPLEMENTATION**

This document defines the exact pilot data model, access contract, storage model, status transitions, deletion rules and retention controls.

---

## 1. Approved pilot tables

### 1.1 `pilot_programs`

Purpose: controls each pilot wave and its campus, time and retention boundaries.

Required columns:

- `id uuid primary key`
- `name text not null`
- `description text null`
- `status pilot_program_status not null default 'draft'`
- `starts_at timestamptz null`
- `ends_at timestamptz null`
- `eligible_campuses campus_location[] not null`
- `retention_days integer not null default 30`
- `created_by uuid not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `archived_at timestamptz null`

Constraints:

- retention: 7–90 days;
- end date must be after start date;
- only super admins create or configure programmes.

### 1.2 `pilot_scenarios`

Purpose: defines controlled tests within a programme.

Required columns:

- `id uuid primary key`
- `program_id uuid not null references pilot_programs on delete cascade`
- `title text not null`
- `instructions text not null`
- `scenario_type pilot_scenario_type not null`
- `expected_category incident_category null`
- `requires_location boolean not null default false`
- `requires_live_tracking boolean not null default false`
- `requires_attachment boolean not null default false`
- `requires_notification boolean not null default false`
- `requires_resource_download boolean not null default false`
- `display_order integer not null default 0`
- `is_active boolean not null default true`
- `created_by uuid not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 1.3 `pilot_participants`

Purpose: explicit student allowlist and consent/withdrawal record.

Required columns:

- `id uuid primary key`
- `program_id uuid not null references pilot_programs on delete cascade`
- `user_id uuid not null`
- `campus campus_location not null`
- `status pilot_participant_status not null default 'invited'`
- `invited_by uuid not null`
- `invited_at timestamptz not null default now()`
- `consented_at timestamptz null`
- `consent_version text null`
- `withdrawn_at timestamptz null`
- `withdrawal_reason text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:

- unique `(program_id, user_id)`;
- participant campus must be included in programme campus scope;
- user must have existing `student` role.

### 1.4 `pilot_sessions`

Purpose: captures one participant's pilot attempt and test environment.

Required columns:

- `id uuid primary key`
- `program_id uuid not null references pilot_programs on delete cascade`
- `participant_id uuid not null references pilot_participants on delete cascade`
- `user_id uuid not null`
- `campus campus_location not null`
- `status pilot_session_status not null default 'in_progress'`
- `started_at timestamptz not null default now()`
- `last_activity_at timestamptz not null default now()`
- `completed_at timestamptz null`
- `expires_at timestamptz not null`
- `device_type text null`
- `browser_name text null`
- `browser_version text null`
- `operating_system text null`
- `viewport_width integer null`
- `viewport_height integer null`
- `network_type text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

No raw IP address will be stored in pilot application tables.

### 1.5 `pilot_reports`

Purpose: isolated simulated incident record.

Required columns:

- `id uuid primary key`
- `program_id uuid not null references pilot_programs on delete cascade`
- `session_id uuid not null references pilot_sessions on delete cascade`
- `scenario_id uuid null references pilot_scenarios on delete set null`
- `participant_id uuid not null references pilot_participants on delete cascade`
- `submitted_by uuid not null`
- `campus campus_location not null`
- `reference_number text not null unique`
- `title text not null`
- `description text not null`
- `category incident_category not null`
- `status pilot_report_status not null default 'received'`
- `is_anonymous boolean not null default false`
- `location_lat numeric null`
- `location_lng numeric null`
- `location_accuracy numeric null`
- `location_description text null`
- `assigned_to uuid null`
- `submitted_at timestamptz not null default now()`
- `simulation_completed_at timestamptz null`
- `deleted_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Rules:

- `submitted_by` always retains authenticated ownership, including anonymous pilot reports;
- anonymous presentation may hide identity in normal campus views but not from audited super-admin access;
- no production incident ID exists;
- no production escalation relation exists.

### 1.6 `pilot_report_events`

Purpose: immutable simulated report timeline.

Required columns:

- `id uuid primary key`
- `program_id uuid not null`
- `report_id uuid not null references pilot_reports on delete cascade`
- `session_id uuid not null`
- `event_type pilot_event_type not null`
- `from_status pilot_report_status null`
- `to_status pilot_report_status null`
- `actor_id uuid not null`
- `actor_role user_role not null`
- `notes text null`
- `metadata jsonb not null default '{}'`
- `created_at timestamptz not null default now()`

Events are append-only through controlled functions.

### 1.7 `pilot_location_events`

Purpose: pilot-only location and live-tracking test results.

Required columns:

- `id uuid primary key`
- `program_id uuid not null`
- `session_id uuid not null references pilot_sessions on delete cascade`
- `report_id uuid not null references pilot_reports on delete cascade`
- `user_id uuid not null`
- `latitude numeric not null`
- `longitude numeric not null`
- `accuracy numeric null`
- `altitude numeric null`
- `heading numeric null`
- `speed numeric null`
- `source pilot_location_source not null`
- `captured_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`

Location data must inherit the programme retention period and be purged with its session/report.

### 1.8 `pilot_attachments`

Purpose: metadata for private pilot evidence uploads.

Required columns:

- `id uuid primary key`
- `program_id uuid not null`
- `session_id uuid not null references pilot_sessions on delete cascade`
- `report_id uuid not null references pilot_reports on delete cascade`
- `uploaded_by uuid not null`
- `storage_path text not null unique`
- `original_filename text null`
- `mime_type text not null`
- `size_bytes bigint not null`
- `checksum text null`
- `created_at timestamptz not null default now()`

Constraints:

- maximum 10 MB per file;
- maximum 3 files per report;
- approved types: JPEG, PNG, WebP, MP4 and PDF;
- private signed access only.

### 1.9 `pilot_notifications`

Purpose: pilot-only in-app notifications.

Required columns:

- `id uuid primary key`
- `program_id uuid not null`
- `session_id uuid null`
- `report_id uuid null`
- `user_id uuid not null`
- `notification_type pilot_notification_type not null`
- `title text not null`
- `message text not null`
- `is_read boolean not null default false`
- `read_at timestamptz null`
- `created_by uuid not null`
- `created_at timestamptz not null default now()`

No push-delivery field or production notification trigger is used.

### 1.10 `pilot_feature_tests`

Purpose: technical event and feature result catalogue.

Required columns:

- `id uuid primary key`
- `program_id uuid not null`
- `session_id uuid not null references pilot_sessions on delete cascade`
- `report_id uuid null references pilot_reports on delete cascade`
- `user_id uuid not null`
- `feature_key text not null`
- `outcome pilot_test_outcome not null`
- `duration_ms integer null`
- `error_code text null`
- `metadata jsonb not null default '{}'`
- `created_at timestamptz not null default now()`

Metadata must exclude incident narrative, attachment contents and unnecessary personal information.

### 1.11 `pilot_feedback`

Purpose: participant experience and confidence feedback.

Required columns:

- `id uuid primary key`
- `program_id uuid not null`
- `session_id uuid not null references pilot_sessions on delete cascade`
- `report_id uuid null references pilot_reports on delete cascade`
- `user_id uuid not null`
- `ease_of_use_rating integer null`
- `confidence_rating integer null`
- `clarity_rating integer null`
- `would_use_in_emergency boolean null`
- `comments text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Ratings must be constrained to 1–5.

### 1.12 `pilot_audit_logs`

Purpose: immutable administrative action and deletion evidence.

Required columns:

- `id uuid primary key`
- `program_id uuid null`
- `actor_id uuid not null`
- `actor_role user_role not null`
- `actor_campus campus_location null`
- `action text not null`
- `entity_type text not null`
- `entity_id uuid null`
- `affected_count integer not null default 1`
- `reason text null`
- `metadata jsonb not null default '{}'`
- `created_at timestamptz not null default now()`

Audit metadata must not retain deleted report narrative or attachment content.

---

## 2. Approved enums

```text
pilot_program_status
  draft
  active
  paused
  completed
  archived

pilot_participant_status
  invited
  consented
  active
  completed
  declined
  withdrawn
  removed

pilot_session_status
  in_progress
  completed
  abandoned
  withdrawn
  expired

pilot_report_status
  received
  assessing
  assigned
  in_progress
  simulation_completed
  cancelled
  withdrawn
  expired

pilot_scenario_type
  standard_report
  emergency_simulation
  location_test
  live_tracking_test
  attachment_test
  notification_test
  resource_download
  end_to_end

pilot_event_type
  report_created
  status_changed
  assigned
  note_added
  location_started
  location_stopped
  attachment_added
  notification_created
  simulation_completed
  report_deleted

pilot_notification_type
  report_received
  status_changed
  assigned
  simulation_completed
  action_required
  session_expiring
  programme_message

pilot_test_outcome
  passed
  failed
  skipped
  denied
  abandoned

pilot_location_source
  initial_fix
  live_tracking
  manual_pin
  resumed_tracking
```

---

## 3. Status transition contract

Allowed report transitions:

```text
received → assessing
received → cancelled
received → withdrawn
assessing → assigned
assessing → cancelled
assessing → withdrawn
assigned → in_progress
assigned → cancelled
assigned → withdrawn
in_progress → simulation_completed
in_progress → cancelled
in_progress → withdrawn
```

`expired` is system-controlled.

Terminal states cannot transition again.

Every transition creates a `pilot_report_events` record in the same transaction.

Students may not change status directly.

---

## 4. RLS contract

### 4.1 Students

Students may:

- read their own participant record;
- create/read/update their own active pilot session within controlled fields;
- create and read their own pilot reports;
- read their own report events;
- create pilot location events for their own active report/session;
- create attachment metadata only for their own report;
- read their own pilot notifications;
- mark their own notifications read;
- create their own feature tests and feedback;
- request withdrawal/deletion through a controlled RPC/function.

Students may not:

- assign reports;
- update report status;
- read another participant;
- alter programme/scenario configuration;
- delete arbitrary records directly.

### 4.2 Campus security users

Security users may:

- read participants, sessions, reports, events, feedback and analytics for their own campus;
- create controlled report events and status transitions for their own campus;
- assign a report to an officer from the same campus;
- create pilot notifications for participants in their campus;
- export campus data;
- request single-report deletion for their campus.

Campus heads may additionally run a campus/program purge for their own campus.

### 4.3 Super admins

Super admins may manage all pilot tables through approved functions and policies.

### 4.4 Anonymous role

The `anon` role receives no pilot table or bucket access.

### 4.5 Role helper architecture

Privileged helper logic follows the Phase 1.5 pattern:

- elevated helpers in `private` schema;
- fixed `search_path`;
- no direct public execution;
- exposed operations use validated invoker functions or JWT-verified Edge Functions.

---

## 5. Storage contract

Bucket:

```text
pilot-report-attachments
```

Visibility:

```text
private
```

Object path:

```text
{program_id}/{campus}/{user_id}/{report_id}/{generated_uuid}.{extension}
```

Rules:

- uploader user ID must match the path user segment;
- report ownership/campus must match database records;
- signed URLs expire after 5 minutes;
- no `getPublicUrl()` usage;
- metadata insert occurs only after successful upload;
- failed metadata insert triggers object cleanup;
- report/session/program deletion removes Storage objects before or inside controlled deletion processing.

---

## 6. Retention contract

Default retention:

```text
30 days after session completion or withdrawal
```

Programme configuration may set 7–90 days.

Retention applies to:

- reports;
- location events;
- attachments;
- notifications;
- feature tests;
- feedback;
- session device metadata.

Participant consent and non-content audit evidence may be retained only as required for pilot governance and must not preserve report narrative or precise location after purge.

### Scheduled purge

`pilot-purge-data` runs daily or is invoked manually.

It identifies:

- expired sessions;
- withdrawn sessions approved for deletion;
- completed programmes beyond retention;
- orphan Storage objects.

The function must:

1. verify service-level authority;
2. calculate affected records;
3. delete Storage objects;
4. delete relational data transactionally where possible;
5. write a non-content audit summary;
6. return counts by table and bucket.

---

## 7. Deletion operations

Approved controlled operations:

```text
pilot_delete_report(report_id, reason)
pilot_delete_session(session_id, reason)
pilot_withdraw_session(session_id, reason)
pilot_purge_campus(program_id, campus, reason)
pilot_purge_program(program_id, reason)
pilot_purge_expired()
```

Authority:

| Operation | Participant | Campus officer | Campus head | Super admin |
|---|---:|---:|---:|---:|
| Withdraw own session | Yes | No | No | Yes |
| Delete own report/session request | Controlled | No | No | Yes |
| Delete one campus report | No | Yes | Yes | Yes |
| Purge campus | No | No | Own campus | Yes |
| Purge programme | No | No | No | Yes |
| Run global retention | No | No | No | Yes/service |

Deletion UI must require a typed confirmation for bulk actions.

---

## 8. Export contract

Campus export contains only the caller's campus.

Super-admin export may be:

- de-identified analytics;
- identified operational pilot export.

Default export is de-identified.

Exports must exclude:

- attachment binaries;
- exact GPS coordinates unless explicitly required;
- signatures;
- raw consent text;
- medical details;
- production incident data.

Every export is logged in `pilot_audit_logs`.

---

## 9. Rollback contract

Phase 3 must provide:

- forward migrations;
- a dependency-aware rollback file;
- Storage bucket cleanup steps;
- Realtime publication removal steps;
- Edge Function undeploy list;
- frontend feature-flag shutdown procedure.

Emergency shutdown order:

1. set `VITE_PILOT_MODE_ENABLED=false` in Preview/Production;
2. pause all pilot programmes;
3. disable pilot Edge Functions;
4. preserve or export required data;
5. remove pilot Realtime subscriptions/publication entries;
6. purge Storage if approved;
7. drop pilot functions/policies/tables only after data approval.

The production application remains operational throughout rollback because it does not depend on pilot tables.
