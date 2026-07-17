# Phase 1.5 — Production Synchronisation and Security Remediation

## Status

**IN PROGRESS**

## Scope

This phase was inserted before Pilot Mode architecture work because the live Supabase comparison identified production schema drift, overly broad access policies, Storage exposure, incomplete function hardening and frontend/backend mismatches.

## Live Supabase project

- Project: `MY CCSF`
- Project reference: `lfelzsubrlqwcsnetpov`
- GitHub branch: `feature/controlled-pilot-mode`
- Production `main`: unchanged

## Completed live remediations

### Schema synchronisation

- Created `public.app_settings`.
- Seeded `welcome_banner_text` using the frontend fallback value.
- Added authenticated read access and super-admin mutation policies.
- Added an automatic `updated_at` trigger.
- Created `public.campus_emergency_contacts`.
- Added campus-aware read access and super-admin create/update/delete policies.
- Added indexes and an automatic `updated_at` trigger.
- No unverified campus emergency numbers were inserted.

### Incident ownership

- Added `incidents.submitted_by` to retain the authenticated submitter for anonymous reports.
- Backfilled existing identifiable records from `reporter_id`.
- Added an index on `submitted_by`.
- Replaced the incident INSERT policy so `submitted_by` must equal `auth.uid()`.
- Replaced incident SELECT access to include the authenticated submitter, reporter, assignee, same-campus CPS officer and super admin.
- Restricted incident deletion to super admins.
- Added a database trigger preventing students from modifying administrative incident fields.
- Preserved student live-location updates for their own cases.

### Location and evidence

- Removed the unrestricted authenticated insert policy from `incident_location_updates`.
- Added incident ownership, assignment, campus and super-admin checks.
- Removed the unrestricted metadata insert policy from `incident_media`.
- Added incident ownership, assignment, campus and super-admin checks.
- Scoped incident-media metadata deletion to authorised staff.

### Storage

- Replaced `incident-media` policies with incident-ID path validation and incident access checks.
- Restricted incident evidence deletion to super admins or same-campus CPS officers.
- Added file-size and MIME-type limits to incident evidence, avatars and carousel images.
- Removed broad object-listing policies from public avatar and carousel buckets.
- Removed broad object listing from `chat-media`.
- Kept `chat-media` public object delivery temporarily because the current frontend stores public URLs; this prevents a production regression until signed-URL support is implemented.

### Functions and RPC exposure

- Fixed the mutable `search_path` on `handle_updated_at()`.
- Revoked direct execution of trigger-only functions from public, anonymous and authenticated roles.
- Revoked anonymous execution of role, campus and administrator helper functions.
- Restricted administrative assignment RPCs to signed-in users; the functions retain internal super-admin/head-admin validation.

### Case management

- Replaced campus-security case-update visibility with same-campus enforcement.
- Replaced case-update creation with same-campus enforcement and `admin_id = auth.uid()`.
- Replaced case-update modification with creator/super-admin and campus checks.

### Performance foundations

Added covering indexes for previously unindexed foreign keys involving:

- admin logs
- announcements
- carousel images
- case escalations
- case updates
- chat messages
- chat rooms
- incident media
- incident resolution
- notification-to-incident relationships
- Wi-Fi access points

## Confirmed remaining work

### Frontend synchronisation

- Regenerate and commit `src/integrations/supabase/types.ts` so it includes:
  - `app_settings`
  - `campus_emergency_contacts`
  - `incidents.submitted_by`
- Move Supabase URL and publishable key to environment variables.
- Raise campus-officer password validation from six to twelve characters.
- Replace hard-coded emergency contact content with backend-driven contacts after official numbers are verified and entered.
- Introduce signed URL handling before making staff chat media fully private.

### Edge Functions

- Enable platform JWT verification for privileged Edge Functions.
- Stop the current push function from reporting simulated delivery as a successful send.
- Implement real Web Push only after VAPID credentials are configured.

### Supabase dashboard-only controls

- Enable leaked-password protection in Auth settings.
- Review MFA enforcement for privileged users.

### Policy optimisation

- Consolidate overlapping permissive policies where doing so does not change access semantics.
- Replace repeated raw `auth.uid()` evaluations with init-plan-safe expressions.
- Retain new indexes despite temporary `unused index` notices while the database contains little or no production traffic.

## Phase 1.5 exit criteria

Phase 1.5 is complete only when:

1. The checked-in Supabase types match the live schema.
2. Frontend environment configuration no longer hard-codes project credentials.
3. Privileged Edge Functions require platform JWT verification.
4. Password validation is consistent across frontend and backend.
5. Push delivery no longer reports false success.
6. Official emergency contact data is centrally managed or clearly marked as awaiting institutional verification.
7. Critical Supabase security-adviser findings are resolved or documented as intentional and access-tested.
8. The application builds successfully with the hardened backend.
