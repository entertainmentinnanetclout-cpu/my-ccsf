# Phase 1.5 — Production Synchronisation and Security Remediation

## Status

**COMPLETE — 17 July 2026**

## Scope

This phase was inserted before Pilot Mode architecture work because the live Supabase comparison identified production schema drift, overly broad access policies, Storage exposure, incomplete function hardening and frontend/backend mismatches.

## Live systems

- Supabase project: `MY CCSF`
- Project reference: `lfelzsubrlqwcsnetpov`
- GitHub branch: `feature/controlled-pilot-mode`
- Production `main`: unchanged

## Completed remediations

### Schema and frontend synchronisation

- Created and secured `public.app_settings`.
- Seeded `welcome_banner_text` using the previous frontend fallback.
- Created and secured `public.campus_emergency_contacts`.
- Added `incidents.submitted_by` and automatic authenticated-submitter population.
- Regenerated the checked-in TypeScript schema definitions to include the new tables and column.
- Moved the browser Supabase URL and publishable key to environment variables.
- Added `.env.example` using the modern Supabase publishable-key format.
- Raised staff-account password validation to twelve characters in both frontend and backend.

### Incident ownership and workflow protection

- Preserved the authenticated owner of anonymous reports through `submitted_by`.
- Restricted incident insertion to the authenticated submitter.
- Allowed reporters and authenticated submitters to view their own cases.
- Restricted incident deletion to super admins.
- Added a database guard preventing students from changing assignment, status, resolution, campus, category and other administrative fields.
- Preserved legitimate student live-location updates for their own incidents.

### Location and evidence

- Removed unrestricted authenticated inserts into `incident_location_updates`.
- Added incident ownership, assignment, campus and super-admin checks.
- Removed unrestricted inserts into `incident_media`.
- Added incident ownership, assignment, campus and super-admin checks for evidence metadata.
- Scoped evidence deletion to authorised staff.
- Retained the private `incident-media` bucket with incident-path validation, file-size controls and MIME restrictions.

### Private staff chat media

- Converted `chat-media` from public to private.
- Restricted uploads to authenticated staff using a user-owned folder path.
- Restricted object reads to authenticated staff.
- Restricted deletion to the uploader or super admin.
- Changed the frontend to store object paths instead of public URLs.
- Added temporary signed-URL resolution for existing and realtime chat messages.
- Preserved backward compatibility for historical absolute media URLs.

### Emergency contacts

- Removed the unverified hard-coded CPS number from the emergency dialog.
- Added a backend-driven campus emergency-contact component.
- The component selects an active campus-specific or global contact.
- When no institutionally verified contact exists, the interface clearly states that official contact details are awaiting verification.
- No unverified emergency number was inserted into the database.

### Roles, campus isolation and RPC exposure

- Corrected the database defect that treated campus heads as super admins.
- Restricted campus-head administration to the head's own campus.
- Prevented campus heads from creating or removing other campus heads.
- Moved elevated role and campus helper logic into the non-exposed `private` schema.
- Replaced exposed elevated functions with validated `SECURITY INVOKER` wrappers.
- Revoked anonymous and public execution of privileged helpers and trigger functions.
- Removed all exposed `SECURITY DEFINER` adviser warnings.

### Case management

- Restricted campus-security case-update visibility to incidents from the same campus.
- Required case-update creators to match the authenticated user.
- Scoped case-update modification by creator, super-admin status and campus.
- Consolidated student and staff case-update read policies.
- Scoped escalation visibility to super admins or the matching campus.

### Edge Functions

The following functions are active with platform JWT verification enabled:

| Function | Version | Final control |
|---|---:|---|
| `create-campus-admin` | 7 | Caller, role, campus, email and 12-character password validation |
| `reset-staff-password` | 4 | Super-admin-only reset-email request |
| `send-push-notification` | 7 | Real Web Push implementation and truthful delivery status |

The push function no longer reports simulated delivery as successful. Until VAPID secrets are configured, it returns HTTP 503 with `delivery_status: not_configured`.

### RLS and performance

- Consolidated overlapping permissive policies.
- Replaced broad `ALL` policies with separate read, insert, update and delete policies.
- Converted repeated `auth.uid()` evaluation to init-plan-safe expressions.
- Added missing foreign-key indexes.
- Cleared all RLS initialization-plan warnings.
- Cleared all multiple-permissive-policy warnings.

## Final adviser state

### Security adviser

Only the following accepted warning remains:

- `auth_leaked_password_protection` — deferred because the current Supabase plan does not provide the feature.

This is a documented plan limitation and is not a Phase 1.5 or Phase 2 blocker.

### Performance adviser

Only informational unused-index notices remain. The indexes are intentionally retained because the current dataset has insufficient traffic to establish representative usage and the indexes support expected production query paths.

## Accepted operational constraints

1. VAPID secrets have not yet been supplied. Browser push remains safely unavailable instead of falsely reporting delivery.
2. Official campus CPS contact records are awaiting institutional verification. The system does not display an unverified number.
3. Leaked-password protection remains deferred until the Supabase subscription supports it.

## Exit criteria result

1. Checked-in Supabase types match the live Phase 1.5 schema — **passed**.
2. Frontend Supabase configuration uses environment variables — **passed**.
3. Privileged Edge Functions require platform JWT verification — **passed**.
4. Staff-password validation is consistent — **passed**.
5. Push delivery no longer reports false success — **passed**.
6. Emergency-contact data is centrally managed and clearly marked pending verification — **passed**.
7. Critical security-adviser findings are resolved or formally accepted as plan-limited — **passed**.
8. The hardened frontend passed the repository production-build workflow — **passed**.

## Completion evidence

- `docs/pilot-mode/01d-live-migration-ledger.md`
- `docs/pilot-mode/PHASE-1-5-COMPLETE.md`
- Live Supabase migration history through `20260717152759_phase_1_5_rls_policy_consolidation`
- Active JWT-verified Edge Functions
- Repository CI production-build verification

**Phase 2 is unblocked.**
