# Phase 1.5 Complete — Production Synchronisation and Security Remediation

## Completion status

**COMPLETE — 17 July 2026**

Phase 1.5 was inserted between the codebase audit and Pilot Mode architecture because the connected live Supabase project exposed production drift and security weaknesses that had to be resolved first.

## Completion result

The current CCSF frontend, checked-in Supabase types, deployed Edge Functions, Storage configuration, database schema, role model, RLS policies, and live migration history are now synchronised for the production application.

Phase 2 may proceed.

## Completed controls

### Frontend and schema

- Added and secured `app_settings`.
- Added and secured `campus_emergency_contacts`.
- Synchronised generated TypeScript types.
- Added `incidents.submitted_by` to retain ownership of anonymous authenticated reports.
- Added automatic submitter population so existing submission components remain compatible.
- Moved Supabase URL and key configuration to environment variables.
- Added `.env.example` using the modern publishable-key format.

### Incident security

- Restricted location updates to authorised incident participants and campus staff.
- Restricted incident-media metadata to authorised incident participants and campus staff.
- Restricted incident deletion to super admins.
- Prevented students from updating workflow, assignment, resolution, campus, and other administrative fields.
- Preserved student access to their own anonymous submissions through `submitted_by`.

### Storage

- Kept incident evidence private with incident-path validation and authorisation.
- Removed broad object-listing policies.
- Converted `chat-media` to a private bucket.
- Updated chat uploads to store object paths rather than public URLs.
- Added signed-URL resolution with backward compatibility for existing absolute URLs.

### Roles and campus isolation

- Corrected the database defect that treated campus heads as super admins.
- Restricted campus-head assignment and removal actions to their own campus.
- Prevented campus heads from appointing or removing other campus heads.
- Moved elevated role helpers into the non-exposed `private` schema.
- Retained only validated security-invoker wrappers in the exposed `public` schema.
- Removed exposed `SECURITY DEFINER` adviser warnings.

### Edge Functions

- `create-campus-admin` version 7: JWT verified, caller and campus scoped, 12-character password minimum.
- `reset-staff-password` version 4: JWT verified and super-admin restricted.
- `send-push-notification` version 7: JWT verified and no longer reports simulated delivery as success.
- Web Push returns `not_configured` with HTTP 503 until VAPID secrets are supplied.

### Emergency contacts

- Removed the unverified hard-coded CPS number from the emergency dialog.
- Added a backend-driven campus contact component.
- Displays an explicit institutional-verification message when no approved number has been entered.
- No unverified emergency number was inserted into the database.

### RLS and performance

- Consolidated overlapping read and `ALL` policies into single-purpose read, insert, update, and delete policies.
- Converted raw `auth.uid()` policy evaluation into init-plan-safe expressions.
- Added missing foreign-key indexes.
- Retained informationally unused indexes for expected production query paths.

## Final Supabase adviser result

### Security

Only the accepted plan-limited warning remains:

- Leaked-password protection disabled.

This warning is excluded from the phase gate because the current Supabase plan does not provide the feature.

### Performance

- No RLS initialization-plan warnings.
- No multiple-permissive-policy warnings.
- Only informational unused-index notices on a low-traffic dataset.

## Accepted operational constraints

1. VAPID credentials have not been configured. Browser push is therefore safely disabled and returns a truthful `not_configured` response rather than false success.
2. Official campus CPS contact numbers are awaiting institutional verification. The system uses the central table and does not display an unverified number.
3. Leaked-password protection remains deferred until a qualifying Supabase plan is adopted.

## Phase 2 gate

Phase 2 is authorised to begin subject to the normal branch and pull-request review process.

Pilot Mode must still remain isolated from:

- `incidents`
- `incident_media`
- `incident_location_updates`
- production `notifications`
- `case_updates`
- `case_escalations`
- production dispatch or external emergency integrations

## Evidence

- `docs/pilot-mode/01c-production-sync-remediation.md`
- `docs/pilot-mode/01d-live-migration-ledger.md`
- Live Supabase migration history through `20260717152759_phase_1_5_rls_policy_consolidation`
- Active JWT-verified Edge Functions
- Updated frontend types, environment configuration, contact component, private media helper, and CI build workflow
