# CCSF / CPS Pilot Mode — Complete Codebase Audit

## Audit status

**Phase 1: COMPLETE**

This audit documents the repository state that materially affects a controlled CCSF/CPS Pilot Mode. It covers the application stack, routes, roles, Supabase schema, direct reads and writes, storage, Realtime, incident lifecycle, emergency tracking, dashboards, escalation, notifications, Edge Functions, deletion behaviour and implementation risks.

## Verification boundary

This is a **repository audit**, not a live Supabase-environment audit.

Verified:

- source code on `feature/controlled-pilot-mode`
- generated Supabase TypeScript schema
- repository SQL migrations
- repository Edge Function source
- application data-access patterns

Not directly verified:

- which migrations have actually been applied to the external Supabase project
- current live RLS policy state
- current Storage bucket configuration
- deployed Edge Function versions and secrets
- live records or production data quality

Phase 2 and Phase 3 must therefore include a manual live-Supabase verification checklist before any SQL is executed.

---

## 1. Application stack

Verified from `package.json`:

- Vite 5
- React 18
- TypeScript 5
- React Router 6
- Supabase JavaScript client 2
- TanStack React Query 5
- React Hook Form
- Zod
- Tailwind CSS 3
- shadcn/Radix UI components
- Framer Motion
- Recharts
- Lucide icons
- browser-image-compression
- PWA service worker in `public/sw.js`

Repository scripts:

- `npm run dev`
- `npm run build`
- `npm run build:dev`
- `npm run lint`
- `npm run preview`

No automated unit or integration test script is currently defined in `package.json`.

---

## 2. Route and portal inventory

Main routes are declared in `src/main.tsx`.

| Route | Access | Main component | Operational purpose |
|---|---|---|---|
| `/` | Public | `Index` | Landing page |
| `/auth` | Public | `Auth` | Authentication |
| `/dashboard` | `student` | `Dashboard` | Student portal |
| `/security/*` | `security`, `admin` | `Security` | Campus CPS/security portal |
| `/admin/*` | `admin` | `Admin` | Super-admin console |
| `/office` | `security`, `admin` | `Office` | Incident office view |
| `/profile` | all authenticated roles | `Profile` | User profile |
| `/profile-completion` | all authenticated roles | `ProfileCompletion` | Required student/profile setup |
| `/judiciary` | `security`, `admin` | `Judiciary` | Case and hearing updates |
| `*` | Any | `NotFound` | Fallback |

### Portal navigation is state-based

The `/dashboard`, `/security/*` and `/admin/*` portals primarily switch internal views with component state rather than declaring separate nested URL routes.

### Auth redirect constraint

`AuthContext` redirects:

- `admin` to `/admin`
- `security` to `/security`
- `student` to `/dashboard`
- incomplete students to `/profile-completion`

Pilot routes must be explicitly exempted from unwanted role redirects.

---

## 3. Authentication and role model

### Role source

- table: `user_roles`
- enum values: `student`, `security`, `admin`
- role priority in `AuthContext`: `admin` → `security` → `student`

### Profile source

- table: `profiles`
- context fields: `id`, `full_name`, `campus`, `email`, `profile_completed`

### Application role meaning

- `admin` = super admin
- `security` = campus CPS/security officer or campus admin
- `student` = student user

### Campus scope

Campus identity is read from `profiles.campus`. The generated enum includes:

- `pretoria_west_main`
- `arcadia`
- `arts`
- `giyani`
- `mbombela`
- `polokwane`
- `garankuwa`
- `soshanguve_south`
- `soshanguve_north`
- `emalahleni`

### Administrative access

`admin_access` associates officers with campus values and an `is_head` flag. The application uses RPCs and an Edge Function to assign, remove and create campus officers.

---

## 4. Supabase client and environment handling

The browser client is defined in `src/integrations/supabase/client.ts`.

Current behaviour:

- typed client using generated `Database`
- persistent auth session
- automatic token refresh
- browser `localStorage`
- hard-coded Supabase URL
- hard-coded public anon key

No service-role key was found in browser code. Service-role access exists only in Edge Functions through environment variables.

### Phase 2 implication

Pilot Mode should use the existing client but a separate service layer and pilot tables. Environment configuration should be moved toward deploy-time variables without treating the anon key as a secret.

---

## 5. Generated Supabase schema inventory

`src/integrations/supabase/types.ts` contains 22 public tables:

1. `accredited_residences`
2. `admin_access`
3. `admin_logs`
4. `announcements`
5. `bento_layouts`
6. `campus_police_stations`
7. `carousel_images`
8. `case_escalations`
9. `case_updates`
10. `chat_messages`
11. `chat_room_members`
12. `chat_rooms`
13. `incident_location_updates`
14. `incident_media`
15. `incidents`
16. `message_reactions`
17. `notifications`
18. `profiles`
19. `push_subscriptions`
20. `typing_indicators`
21. `user_roles`
22. `wifi_access_points`

No generated database views are present.

### Generated RPC inventory

- `assign_campus_admin`
- `ensure_all_staff_room`
- `get_security_officers`
- `get_user_campus`
- `get_user_role`
- `has_campus_access`
- `has_role`
- `is_campus_admin`
- `is_head_admin`
- `is_super_admin`
- `remove_campus_admin`

### Schema drift found

`src/pages/Dashboard.tsx` queries `app_settings`, but `app_settings` is absent from the generated types. This indicates one of the following:

- generated types are stale
- the live table exists but is not represented
- the query targets a table absent from the current schema

This must be checked directly in Supabase before implementation.

`typing_indicators` exists in generated types but current staff chat uses Supabase Presence rather than this table. `accredited_residences` is present in the schema and migrations but no active frontend use was found by repository code search.

---

## 6. Standard incident submission lifecycle

Source: `src/components/student/ReportIncident.tsx`.

### Input captured

- title
- description
- incident category
- written location description
- GPS latitude and longitude
- anonymous-report flag
- consent checkbox
- drawn signature
- one or more attachments

### Location handling

- requests browser high-accuracy location
- reverse-geocodes through OpenStreetMap Nominatim
- inserts the readable address into the location description

### Production database write

Direct insert into `incidents` with:

- `title`
- `description`
- `category`
- `location_lat`
- `location_lng`
- `location_description`
- `is_anonymous`
- `reporter_id`
- `campus`
- `signature_data`

The inserted record is returned with `.select().single()`.

### Attachment flow

1. upload file to Storage bucket `incident-media`
2. object path is `${incident.id}/${timestamp}-${index}.${extension}`
3. insert metadata into `incident_media`
4. metadata includes incident ID, stored path, MIME type and size

### Critical Pilot Mode requirement

Pilot submission must be routed before any write to:

- `incidents`
- `incident_media`
- `incident-media`

---

## 7. Emergency alert and live-location lifecycle

### Emergency creation

Source: `src/components/student/EmergencyReport.tsx`.

The emergency component:

1. requests current location
2. reads the user's full `profiles` row
3. composes a detailed description with student, emergency-contact and medical data
4. inserts an emergency record into `incidents`
5. starts live tracking with the new incident ID
6. tells the student that campus security has been notified

The emergency category is currently hard-coded to `Assault common`.

### Live tracking

Source: `src/hooks/useLocationTracking.ts`.

- tracking interval: 30 seconds
- preferred accuracy: within 100 metres
- movement checks prevent some redundant updates
- history inserts into `incident_location_updates`
- latest position updates `incidents`
- browser persistence key: `emergency_tracking`
- tracking may resume after refresh while the incident remains active

### Admin location view

`LiveLocationTracker`:

- reads `incident_location_updates`
- subscribes to new inserts filtered by incident ID
- shows latest location, accuracy and history
- provides Google Maps links

### Critical Pilot Mode requirement

Pilot Mode requires a separate tracking service, table destination, Realtime channel and browser storage key. It may not call the current emergency submission or tracking functions.

---

## 8. Student case lifecycle

Source: `src/components/student/MyCaseReports.tsx`.

The student view:

- reads `incidents` filtered by `reporter_id`
- subscribes to all incident changes filtered by the student's ID
- displays `pending`, `assigned`, `resolved` and `rejected`
- reads `case_updates` for selected incidents
- displays resolution notes, scheduled hearings and progress updates

A pilot case view needs separate query keys, pilot tables and pilot Realtime subscriptions.

---

## 9. Incident query and cache layer

`src/hooks/queries/useIncidentsQuery.ts` uses React Query key `incidents` and supports:

- first-page list
- infinite pagination
- campus filtering
- single incident
- active `pending` and `assigned` emergencies
- incident creation
- incident update

Settings:

- page size: 50
- standard stale time: 30 seconds
- emergency refresh: 30 seconds

Pilot queries must use distinct keys, for example `pilot-reports`, to prevent cache mixing.

---

## 10. Production status, assignment and resolution workflow

### Admin incident list

`AdminIncidents`:

- reads all `incidents`
- subscribes to all changes on `incidents`
- applies client-side status and text filters
- opens `IncidentDetailsModal`

### Incident details and actions

`IncidentDetailsModal`:

- reads one incident
- reads `incident_media`
- gets security officers through `get_security_officers`
- falls back to `profiles`
- directly updates `incidents`

Actions:

- assign officer → `assigned_to`, status `assigned`
- resolve → status `resolved`, resolution notes, resolved timestamp
- reject → status `rejected`, resolution notes
- reopen → status `pending`, clears resolution fields

### Office portals

Both `Office` and `OfficeView`:

- read `incidents`
- subscribe to all incident changes
- update incident status directly
- calculate dashboard metrics client-side

`Office` depends on RLS for campus restriction. `OfficeView` is the super-admin all-campus view.

### Case updates

`CaseUpdatesManager`:

- reads incidents
- reads `case_updates`
- inserts notes, hearings, resolutions or escalation updates
- stores optional scheduled date

### Notification trigger

A repository migration defines `notify_incident_status_change()` and an `on_incident_update` trigger. Status changes notify the reporter; assignment changes notify the assigned officer by inserting into `notifications`.

Pilot status simulation must not update `incidents`, because doing so can activate this production notification trigger.

---

## 11. Escalation workflow

`CaseEscalation` and `useCaseEscalationsQuery` use:

- `campus_police_stations`
- `case_escalations`
- `admin_logs`
- joined `incidents`

The current UI:

- filters serious categories
- chooses SAPS or Metro Police
- chooses a station mapped to the campus
- records priority, CAS number and notes
- inserts a `case_escalations` row
- records `case_escalated` in `admin_logs`

### Current external-integration state

No SAPS or Metro Police API request is currently made. The UI explicitly states that automatic submission is planned for a future MySAPS integration.

Pilot Mode must remain isolated from both the current production escalation tables and any future external dispatch implementation.

---

## 12. Notifications and push architecture

### In-app notifications

Tables and components:

- `notifications`
- `NotificationBell`
- `useNotificationsQuery`
- `MasterSyncContext`

Behaviour:

- user-specific reads
- unread counts
- mark-one or mark-all as read
- Realtime INSERT subscription filtered by user ID
- status and assignment notifications may be created by a database trigger

### Browser push subscriptions

`usePushNotifications`:

- registers `/sw.js`
- uses a hard-coded public VAPID key
- upserts `push_subscriptions`
- deletes subscriptions when disabled

### Push Edge Function

`send-push-notification`:

- authenticates caller
- allows `admin` or `security`
- reads `push_subscriptions` with service role
- prepares a payload
- currently does not call a Web Push transport library or provider
- logs each endpoint and counts it as successful

Therefore the current function is a processing stub, not verified end-to-end push delivery.

### Service worker

`public/sw.js` supports:

- static and dynamic caching
- push display
- notification clicks
- a placeholder background-sync handler for `sync-incidents`

The background-sync function currently logs only; it does not persist or submit incidents.

---

## 13. Realtime inventory

| Channel | Table / feature | Scope |
|---|---|---|
| `cases-changes` | `incidents` | all events |
| `master-sync-consolidated` | incidents, profiles, announcements, carousel_images, notifications | all events |
| `my-case-reports` | `incidents` | reporter-filtered |
| `admin-incidents` | `incidents` | all events |
| `office-incidents` | `incidents` | all events |
| `office-embed-incidents` | `incidents` | all events |
| `location-updates-{incidentId}` | `incident_location_updates` | incident-filtered inserts |
| `user-notifications` | `notifications` | user-filtered inserts |
| `announcements-feed` | `announcements` | all events |
| `carousel-images-realtime` | `carousel_images` | all events |
| `carousel-manager` | `carousel_images` | all events |
| `rooms-changes` | `chat_rooms` | all events |
| `room-messages-{roomId}` | `chat_messages` | room-filtered inserts |
| `room-reactions-{roomId}` | `message_reactions` | all events |
| `typing-{roomId}` | Presence | typing state |

Pilot Mode must use uniquely named channels and pilot-only tables.

---

## 14. Master synchronization context

`MasterSyncContext` initially fetches:

- `incidents`
- `profiles`
- `announcements`
- `carousel_images`
- `notifications`

It then subscribes to one consolidated Realtime channel for those tables.

The context exposes filters for campus, status, profile campus and active emergencies.

### Risk

Comments suggest campus filtering, but some frontend fetches are broad and rely on RLS. Pilot data must never be added to production tables because it would propagate through this global context, dashboards and KPIs.

---

## 15. Student dashboard support features

### News

`NewsFeed`:

- reads active/non-expired `announcements`
- subscribes through `announcements-feed`

### Carousel

`CampusCarousel`:

- reads active `carousel_images`
- filters by campus or `all`
- subscribes through `carousel-images-realtime`

### Campus map

`CampusMap`:

- reads the student's campus from `profiles`
- reads active `wifi_access_points` for that campus
- also contains hard-coded campus addresses, coordinates and phone numbers
- runs network speed tests against Google and Cloudflare endpoints

### Student chat

`StudentChat` is not connected to Supabase or an AI service. It is a local rule-based interface with hard-coded responses and hard-coded emergency contacts.

Several contact numbers in `StudentChat`, `EmergencyReport` and `CampusMap` do not match the recently supplied CPS campus hotline list. Centralizing emergency contacts is a production-readiness requirement.

---

## 16. Staff communication system

`StaffCommunication` uses:

- `user_roles`
- `profiles`
- `chat_rooms`
- `chat_room_members`
- `chat_messages`
- `message_reactions`
- Storage bucket `chat-media`
- Realtime Postgres channels
- Realtime Presence for typing

It supports:

- staff discovery
- group/private rooms
- room membership
- messages
- reactions
- public media URLs
- typing indicators

`typing_indicators` exists in generated schema but the current component uses Presence instead of the table.

Pilot status messages should use pilot in-app notifications, not the staff chat system.

---

## 17. Administrative content and configuration

### Announcements

`AdminAnnouncements` performs full CRUD on `announcements`.

### Carousel management

`CarouselManager` performs CRUD on `carousel_images` and uploads to `carousel-images`.

Deleting a carousel database row does not delete the Storage object, creating a possible orphan-file condition.

### Campus overview images

`CampusOverview` also uploads campus entrance images to `carousel-images` and creates or updates `carousel_images`.

### Wi-Fi access points

`WifiAccessPointManager` performs CRUD on `wifi_access_points`, optionally filtered to the officer's campus.

### Dashboard layout

`useBentoLayout` reads and upserts `bento_layouts`, with localStorage fallback using `bento-layout-{dashboardId}`.

### Welcome banner drift

The student dashboard reads `app_settings`, which is not present in generated types.

---

## 18. Profile and identity storage

### Profiles

Profile reads and updates occur through:

- `AuthContext`
- `Profile`
- `ProfileCompletion`
- `OfficerSettings`
- `useProfilesQuery`
- admin/student lookup components

### Avatar storage

`AvatarUpload`:

- accepts images up to 5 MB
- compresses to approximately 0.5 MB / 400 px
- uploads to `avatars`
- obtains a public URL
- updates `profiles.avatar_url`

Old avatar objects are not explicitly deleted.

### Password administration

- users may verify their current password and call `auth.updateUser`
- super admins may invoke `reset-staff-password`

---

## 19. Storage bucket inventory

| Bucket | Producer | URL model | Deletion behaviour observed |
|---|---|---|---|
| `incident-media` | `ReportIncident` | object path stored in `incident_media` | no UI deletion found |
| `avatars` | `AvatarUpload` | public URL | old object not explicitly deleted |
| `carousel-images` | `CarouselManager`, `CampusOverview` | public URL | database deletion does not remove object |
| `chat-media` | `StaffCommunication` | public URL | no UI object deletion found |

### Incident media inconsistency

`ReportIncident` stores an object path in `incident_media.media_url`, while `IncidentDetailsModal` renders `media_url` directly as an image/video URL. Unless a trigger or transformation not visible in the repository converts it, incident evidence may require signed/public URL resolution that the modal does not perform.

A separate private `pilot-report-attachments` bucket remains recommended.

---

## 20. Edge Function inventory

All repository Edge Functions discoverable through code search and invocation tracing are listed below.

### `create-campus-admin`

- validates input and password length
- requires bearer authorization
- verifies caller through anon client
- checks `is_super_admin` or `is_head_admin`
- uses service role
- lists Auth users to detect duplicate email
- creates confirmed Auth user with `security` metadata
- inserts `admin_access`
- expects a new-user trigger to create profile and role

### `reset-staff-password`

- requires bearer token
- verifies claims
- checks `user_roles` for `admin`
- uses service role
- calls `auth.admin.generateLink` for password recovery

The response wording says the user will receive an email, but `generateLink` primarily generates recovery-link data; actual email delivery must be verified in the deployed environment.

### `send-push-notification`

- requires authenticated `admin` or `security`
- uses service role
- reads `push_subscriptions`
- validates title and message length
- builds push payload
- currently does not send through a Web Push library/provider

### Required secrets

The functions reference:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

No Pilot Mode function has yet been created or deployed.

---

## 21. RLS and migration findings

The repository contains many policy-bearing migrations. Important verified rules include:

- students can read their own incidents
- campus security users can read incidents for their campus
- super admins can read all incidents
- incident campus/reporter can be auto-attached before insert
- incident media and location history have policies linked to reporter, assigned officer, super admin or same-campus security
- `push_subscriptions` are managed by their owner
- escalation management is restricted to admins; campus security receives campus-scoped read access in the audited migration
- police-station data is publicly readable in the migration

### Policy-history warning

Different migrations drop and recreate policies with different wording and breadth. For example, one migration permits authenticated incident insert with `WITH CHECK (true)`, while earlier logic restricts insert to students. The effective live policy depends on migration application order and any manual changes.

Phase 3 must begin with a live policy export or manual policy inventory from Supabase.

---

## 22. Current deletion inventory

### Existing deletion functions in UI

- announcements: database row delete
- carousel image records: database row delete
- Wi-Fi access points: database row delete
- message reactions: database row delete
- push subscriptions: delete by user
- campus-admin access: remove through RPC

### Missing or unverified deletion paths

- incidents
- incident media objects
- incident media metadata
- incident location history
- case updates
- case escalations
- admin logs
- chat media objects
- old avatars
- cascade cleanup visible to admins
- retention cleanup

Pilot Mode therefore needs server-side, role-checked cascade deletion RPCs and a retention process rather than client-side multi-table deletion.

---

## 23. Complete direct data-interaction summary

### Incident domain

- `incidents`: student create; admin/security read/update; student own-case read; Realtime throughout
- `incident_media`: student metadata create; authorised read
- `incident_location_updates`: tracking create; authorised read and Realtime
- `case_updates`: admin/security create/read; student related-case read
- `case_escalations`: admin create/update; authorised read
- `campus_police_stations`: escalation reference data
- `admin_logs`: escalation audit record

### Identity and administration

- `profiles`: broad authenticated reads/updates under RLS
- `user_roles`: role resolution and staff discovery
- `admin_access`: campus-officer scope
- RPCs: campus assignment, role/campus checks and security-officer lookup

### Communication and awareness

- `notifications`: status/assignment alerts and user read state
- `push_subscriptions`: browser push registration
- `announcements`: campus awareness feed
- `carousel_images`: campus visual content
- `chat_rooms`, `chat_room_members`, `chat_messages`, `message_reactions`: staff communication

### Supporting systems

- `wifi_access_points`: student map and admin management
- `bento_layouts`: personal dashboard layout
- `accredited_residences`: schema/migration only in current code search
- `typing_indicators`: schema/migration only; current chat uses Presence
- `app_settings`: code query only; missing from generated types

The detailed file-by-table matrix is stored in `01a-data-interaction-matrix.md`.

---

## 24. Security and architecture findings

1. **Pilot data cannot safely share `incidents`.** Production contexts, queries, triggers, Realtime channels, metrics, case views and escalation all consume this table.
2. **The emergency button is a direct production action.** It must be replaced or disabled in Pilot Mode.
3. **Location tracking is persistent and resumable.** A separate pilot key and table are mandatory.
4. **Production status updates create production notifications.** Pilot simulation must use pilot events and pilot notifications.
5. **Campus scoping often relies on RLS rather than frontend filters.** Pilot RLS must be designed and tested independently.
6. **Schema and code have drift.** `app_settings` is untyped; some category/contact data is hard-coded.
7. **Emergency contacts are inconsistent.** Multiple outdated/hard-coded numbers exist.
8. **Push delivery is not implemented end to end.** The Edge Function currently simulates processing.
9. **Storage cleanup is incomplete.** Several database deletes leave objects behind.
10. **Incident evidence URL handling may be incomplete.** Stored path versus rendered URL requires verification.
11. **No automated test suite is configured.** Phase 6 must add a practical test foundation or at minimum scripted verification.
12. **No live Supabase state has been inspected.** Repository policies cannot be assumed to equal production policies.

The detailed risk register is stored in `01b-security-risk-register.md`.

---

## 25. Phase 1 conclusion

The repository audit supports the following non-negotiable architecture decision:

> Use the existing application and Supabase project, but create isolated `pilot_*` tables, a separate pilot attachment bucket, pilot-only Realtime channels, separate React Query keys and a central Pilot Mode service boundary.

Do not place pilot submissions in `incidents` with only an `is_pilot` field. Doing so would contaminate production dashboards, notifications, Realtime subscriptions, analytics, assignment workflows and future escalation integrations.

## Phase 1 deliverables

- `00-phase-tracker.md`
- `01-codebase-audit.md`
- `01a-data-interaction-matrix.md`
- `01b-security-risk-register.md`

**Phase 1 is complete. Phase 2 may begin with architecture and exact file-change planning.**
