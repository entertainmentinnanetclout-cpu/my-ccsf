# Phase 3 — Pilot Backend Migration Package

## Status

**APPLIED TO LIVE SUPABASE — 17 July 2026**

Project: `MY CCSF`  
Project reference: `lfelzsubrlqwcsnetpov`

## Critical execution warning

The Phase 3 migrations in this package have already been applied through the connected Supabase migration API.

**Do not replay or paste reconstructed forward DDL into production.** The authoritative forward SQL is stored in:

```text
supabase_migrations.schema_migrations
```

Use `00_extract_applied_phase3.sql` to retrieve the exact stored statements in execution order.

## Package contents

- `00_extract_applied_phase3.sql` — exports the exact stored Phase 3 forward SQL and migration metadata.
- `90_verify_phase3.sql` — validates tables, RLS, grants, policies, Storage, Realtime, RPC exposure and production isolation.
- `99_rollback_phase3.sql` — destructive rollback script protected by an explicit confirmation setting and empty-bucket guard.

## Applied scope

Phase 3 created only additive Pilot Mode infrastructure:

- nine `pilot_*` enums;
- twelve `pilot_*` tables;
- private helper functions and integrity triggers;
- exact authenticated table privileges;
- student, campus-security and super-admin RLS policies;
- private `pilot-report-attachments` Storage bucket;
- twelve validated public `SECURITY INVOKER` RPC wrappers;
- private operational cores in `pilot_private`;
- pilot-only Realtime publication entries;
- operational and foreign-key indexes.

## Production isolation

The Phase 3 schema has no foreign keys to:

- `incidents`;
- `incident_media`;
- `incident_location_updates`;
- `notifications`;
- `case_updates`;
- `case_escalations`.

No production incident table, production Storage bucket, production notification function or emergency-dispatch integration was modified by Phase 3.

## Rollback control

Rollback is not authorised by this package. It requires:

1. a verified database backup;
2. confirmation that no Pilot Mode data must be retained;
3. removal of all objects from `pilot-report-attachments`;
4. an explicit transaction-local confirmation value;
5. super-admin and project-owner approval.

The rollback file aborts if the private bucket is not empty.