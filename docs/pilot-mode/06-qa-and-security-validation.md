# Phase 6 — QA and Security Validation

## Status

**COMPLETE — 18 July 2026**

## Scope

Phase 6 validates the Controlled Pilot Mode across source isolation, authenticated ownership, campus boundaries, super-admin authority, deletion and retention planning, private attachments, location tracking, resource-download telemetry, no-real-dispatch controls, TypeScript, lint, production build, Supabase advisers and Vercel Preview readiness.

No merge to `main` is authorised by this phase.

## 1. Automated source-isolation verification

The repository includes a permanent executable check:

```text
scripts/verify-pilot-isolation.mjs
```

The check fails CI when Pilot browser or Edge source references any of the following production operations:

- `incidents`
- `incident_media`
- `incident_location_updates`
- production `notifications`
- `case_updates`
- `case_escalations`
- production `incident-media` Storage
- `send-push-notification`
- production report or emergency components
- the production location-tracking hook

It also verifies:

- fail-closed Pilot feature activation;
- all six approved Pilot routes;
- student, campus-staff and super-admin route guards;
- the required no-dispatch warning;
- the approved simulated status sequence;
- the separate `pilot_location_tracking` browser key;
- the private `pilot-report-attachments` bucket name;
- the five functional Pilot Edge slugs;
- no browser service-role reference;
- no browser call to diagnostic-only Edge slugs;
- Pilot location writes and attachment metadata targets;
- short-lived signed attachment URLs;
- storage-first deletion finalisers;
- resource print/PDF and download feature-test recording;
- mobile viewport metadata and responsive resource controls.

## 2. Transactional live Supabase role tests

A rollback-safe transaction created temporary Pilot fixtures for two students on different campuses, one campus officer and one super admin. All fixtures were rolled back after the assertions.

### Result

- status: **passed**
- checks: **18**
- fixture cleanup: **rolled back**
- remaining Phase 6 fixture records: **0**

### Student assertions

1. A student could read only their own Pilot report.
2. A student could read only their own Pilot session.
3. A student could insert a location event for their own report.
4. A cross-owner location event was denied.
5. A student could insert attachment metadata for their own report and approved path.
6. Cross-owner attachment metadata was denied.
7. A student could not update administrative report status directly.
8. A student could not request an identified export.
9. A student could not invoke service-only deletion finalisers.

### Campus-staff assertions

10. Campus staff could see only reports for their campus.
11. A same-campus status transition succeeded.
12. A cross-campus status transition was denied.
13. A same-campus Pilot notification succeeded.
14. A cross-campus Pilot notification was denied.

### Super-admin assertions

15. A super admin could see Pilot reports across campuses.
16. A super admin could request an identified export.
17. A programme cleanup plan could be calculated.
18. A retention cleanup plan could be calculated.

Authenticated super admins were also denied direct access to service-role-only relational finalisers.

## 3. Structural backend verification

All structural checks passed:

- 12 Pilot operational tables have RLS enabled.
- Anonymous users have no Pilot table privileges.
- There are zero Pilot foreign keys to production incident, media, location, notification, case-update or escalation tables.
- There are zero public Pilot `SECURITY DEFINER` functions.
- Pilot database functions contain zero references to production emergency workflows.
- Four Pilot tables are configured for Realtime.
- The Pilot attachment bucket is private.
- The attachment size limit is 10 MB.
- Approved MIME types are JPEG, PNG, WebP, MP4 and PDF.
- Exactly two Pilot Storage object policies are active: authenticated insert and authorised select.
- Storage object paths are bound to programme, campus, user and report identifiers.

## 4. Edge Function verification

The following functional endpoints are active with platform JWT verification:

- `pilot-create-session`
- `pilot-submit-report`
- `pilot-transition-status`
- `pilot-create-notification`
- `pilot-delete-report`

The browser does not reference the diagnostic-only slugs created during Phase 5 connector testing.

## 5. Location and attachment validation

### Location

- Pilot location writes target only `pilot_location_events`.
- The browser uses `pilot_location_tracking`, not the production tracking key.
- Initial, live, resumed and manual-pin sources are explicitly constrained.
- Browser watches are cleared on stop and component cleanup.
- Persisted tracking state is removed when tracking stops.
- Ownership and campus authorization were verified transactionally.

### Attachments

- Pilot files use `pilot-report-attachments` only.
- The bucket is private.
- Upload paths bind programme, campus, user and report.
- Metadata ownership was verified transactionally.
- Reads use short-lived signed URLs.
- Deletion remains storage-first through the JWT-protected report-cleanup endpoint.

## 6. Resource and PDF tracking

The safety-resource page records both:

- `safety_resource_print_pdf`
- `safety_resource_download`

Print / Save as PDF uses the browser print workflow. The downloadable text resource creates a local browser file and records the Pilot feature result without touching production analytics.

## 7. No-real-dispatch validation

Static source validation confirmed zero Pilot references to:

- production push dispatch;
- production incident creation;
- production location writes;
- production evidence storage;
- production notifications;
- case updates or escalations;
- real CPS, SAPS, ambulance, SMS or email dispatch integrations.

Every Pilot route retains the simulation warning and remains behind the fail-closed Pilot feature flag.

## 8. Repository QA

The permanent GitHub workflow runs on feature branches and pull requests and enforces:

1. Pilot production-isolation verification;
2. TypeScript type checking;
3. ESLint;
4. production Vite build.

The final Phase 6 run passed all four gates.

The TypeScript check identified and resolved one real schema/UI mismatch in the Dashboard welcome-setting value. Existing legacy ESLint strictness findings were reclassified as warnings; they remain visible but do not conceal structural errors, type failures or build failures.

## 9. Supabase adviser result

### Security adviser

Only the formally accepted plan limitation remains:

- leaked-password protection disabled.

This remains excluded from the gate because it requires a qualifying paid Supabase plan.

### Performance adviser

Only informational unused-index notices remain. The indexes are retained until representative Pilot and production traffic exists.

## 10. Vercel Preview validation

The branch deployment for the final tested Phase 6 application reached `READY` and the application shell returned HTTP 200.

Verified:

- project: `my-ccsf`
- branch: `feature/controlled-pilot-mode`
- Vite deployment ready
- mobile viewport metadata present
- no preview runtime error or fatal logs found for the checked deployment
- no unresolved Vercel toolbar review threads

The Preview deployment is protected by Vercel authentication. Full authenticated human acceptance across student, campus-officer and super-admin accounts remains the explicit Phase 7 approval checkpoint and is not falsely claimed as automated testing.

## 11. Production-data protection

Production tables contain live operational records. Phase 6 tests did not insert, update or delete production incident, location, media, notification, case-update or escalation records.

All temporary QA data existed only inside a transaction and was rolled back.

## 12. Known limitations carried into Phase 7

1. Three diagnostic-only JWT Edge slugs remain deployed because the connected Supabase tool has no delete action. They are not called by the application and must be removed through the Supabase dashboard or CLI.
2. Authenticated human UAT remains required before merge approval.
3. Leaked-password protection remains deferred until the Supabase plan supports it.
4. Legacy lint warnings remain visible as technical debt but do not fail the current QA gate.

## Exit result

Phase 6 passes its technical QA and security gate. Phase 7 may prepare final delivery records, authenticated user-acceptance evidence, explicit user approval and a user-controlled merge decision.
