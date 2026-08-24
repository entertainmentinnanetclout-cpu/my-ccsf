# Traffic Department Release

## Scope

This release adds Traffic as a first-class CCSF service:

- public visitor parking requests and private-token status tracking;
- student vehicle registration and parking-permit review;
- the explicit rule that students park only in marked student parking zones;
- Traffic and CPS gate approval, check-in and check-out;
- campus-scoped Traffic Operations for security staff and institution-wide access for admins;
- road-safety notices;
- a private image-onboarding workflow for the official white circular permit.

The digital circular permit is intentionally watermarked as an under-development format preview. The final artwork is activated only after Traffic photographs/uploads the real permit and the institution verifies its fields and layout.

## Routes

- /traffic - public visitor booking, tracking and road-safety guidance.
- /dashboard?tab=traffic - student parking rules and permit request.
- Admin Traffic tab - institution-wide operations.
- Campus-security Traffic tab - campus-scoped operations.

## Supabase data and security

Migration: supabase/migrations/20260824120000_traffic_department.sql

Tables:

- traffic_visitor_passes
- traffic_student_permits
- traffic_permit_templates
- traffic_gate_events
- traffic_road_safety_notices

Storage bucket:

- traffic-permit-templates (private, images only, 10 MB limit)

Visitor rows are not directly exposed to anonymous users. Creation and tracking use narrow RPCs. A tracking token is returned once, stored only as a SHA-256 hash, and required with the reference for later lookup. Public submission is rate-limited per contact fingerprint and rejects duplicate vehicle/campus/date requests.

Staff reads are protected by RLS. Admins can operate across campuses; security staff require matching campus access. Status transitions run through RPCs so approvals and gate events cannot be silently rewritten from the browser.

The visitor pass table is deliberately not added to Supabase Realtime because it contains tracking hashes and contact fingerprints. Staff actions refresh the interface after mutation, while student permit changes use Realtime safely.

## Deployment

1. Apply the Traffic migration to the linked Supabase project through the approved migration pipeline.
2. Confirm Data API grants and RLS policies with the Supabase RLS tester or policy tests.
3. Confirm the traffic-permit-templates bucket is private and rejects non-image or oversized uploads.
4. Assign/verify campus access for security staff.
5. Deploy the web app.
6. Run npm run test:traffic, npm run typecheck, npm run lint, and npm run build.
7. Complete UAT before activating real visitor entry.

## UAT checklist

- A public visitor can submit a request and receives a reference plus one-time private token.
- A wrong reference/token pair returns no visitor data.
- Duplicate active requests for the same vehicle/campus/date are rejected.
- A campus security user sees only their campus.
- An admin can see all campuses.
- Pending visitor passes can move to approved/rejected only.
- Approved passes can check in; checked-in passes can check out.
- A student can request one permit only for their verified campus.
- Students cannot edit active/suspended permits directly.
- A permit photo can be captured from a phone and uploaded as a private draft.
- Public and student pages show the circular preview as under development.
- Gate staff understand that approval remains subject to identification and current campus conditions.

## Institutional onboarding still required

Traffic must provide:

- a clear photograph/scan of each official circular permit;
- exact printed fields, numbering rules and validity periods;
- campus gate names, hours and escalation contacts;
- approval/rejection wording;
- retention periods for visitor contact and vehicle data;
- the operational owner authorised to activate permit templates.

Until those decisions are signed off, the module remains visible and functional for staged testing but labels the permit format as under development.
