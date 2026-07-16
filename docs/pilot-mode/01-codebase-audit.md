# CCSF / CPS Pilot Mode — Codebase Audit

## Audit status

**Phase 1: IN PROGRESS**

This document records verified repository behaviour before Pilot Mode implementation. It will be expanded until all routes, Supabase operations, storage flows, Edge Functions, role restrictions and operational dashboards are mapped.

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
- Tailwind CSS
- shadcn/Radix UI components
- Framer Motion
- Recharts
- Lucide icons

Current repository scripts:

- `npm run dev`
- `npm run build`
- `npm run build:dev`
- `npm run lint`
- `npm run preview`

No automated test script has yet been identified in `package.json`.

---

## 2. Main routing structure

Verified in `src/main.tsx`.

### Public routes

- `/`
- `/auth`

### Student routes

- `/dashboard`
- `/profile`
- `/profile-completion`

### Campus security/admin routes

- `/security/*`
- `/office`
- `/judiciary`
- `/profile`
- `/profile-completion`

### Super-admin routes

- `/admin/*`
- `/security/*`
- `/office`
- `/judiciary`
- `/profile`
- `/profile-completion`

### Existing role gates

- `student`
- `security`
- `admin`

### Important routing constraint

`AuthContext` redirects users by role:

- `admin` → `/admin`
- `security` → `/security`
- `student` → `/dashboard`
- incomplete student profiles → `/profile-completion`

A Pilot Mode route must account for this redirect behaviour so that authenticated pilot participants are not forced away from `/pilot` or other approved pilot routes.

---

## 3. Authentication and role model

Verified in `src/contexts/AuthContext.tsx`.

### Current role source

Roles are queried from:

- `user_roles`

Role selection priority:

1. `admin`
2. `security`
3. `student`

### Profile source

Profiles are queried from:

- `profiles`

Current fields loaded into the authentication context:

- `id`
- `full_name`
- `campus`
- `email`
- `profile_completed`

### Convenience role mapping

- `isSuperAdmin` → role is `admin`
- `isCampusAdmin` → role is `security`
- `isStudent` → role is `student`

Pilot Mode should reuse these roles rather than inventing incompatible production roles.

---

## 4. Supabase client

Verified in `src/integrations/supabase/client.ts`.

The application currently creates one typed browser Supabase client with:

- persistent sessions
- automatic token refresh
- `localStorage` session storage

### Security observation

The project URL and anon key are currently hard-coded in the client file rather than read from environment variables.

The anon key is designed to be public, but the configuration should still be reviewed during the security phase for deployment hygiene and environment separation.

No service-role key was found in the inspected browser client.

---

## 5. Standard incident-report workflow

Verified in `src/components/student/ReportIncident.tsx`.

### Student inputs

- title
- description
- incident category
- location description
- anonymous-report flag
- GPS latitude and longitude
- consent
- signature
- one or more attachments

### Location process

The component requests high-accuracy browser geolocation and reverse-geocodes coordinates through the OpenStreetMap Nominatim API.

### Production incident write

The component inserts directly into:

- `incidents`

Verified fields include:

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

### Production attachment flow

Files are uploaded to the Supabase Storage bucket:

- `incident-media`

Attachment metadata is then inserted into:

- `incident_media`

Verified metadata fields:

- `incident_id`
- `media_url`
- `media_type`
- `file_size`

### Pilot isolation requirement

Pilot Mode must intercept this workflow before any insert into `incidents`, upload to `incident-media`, or insert into `incident_media`.

---

## 6. Emergency alert workflow

Verified in `src/components/student/EmergencyReport.tsx`.

### Data sources

The emergency component reads the current student's profile from:

- `profiles`

It uses personal, emergency-contact and medical information to construct a detailed emergency description.

### Production emergency write

The emergency button inserts directly into:

- `incidents`

The inserted incident includes:

- emergency title
- generated emergency description
- category
- reporter ID
- anonymous flag
- current location
- location description

### Live tracking

After the incident is created, the component starts location tracking through:

- `useLocationTracking`

### Pilot risk

This is a high-risk production path. Pilot Mode must never call this current production emergency submission function.

A pilot emergency interaction must use a separate simulation service and must display that no emergency service has been dispatched.

---

## 7. Live-location tracking

Verified in `src/hooks/useLocationTracking.ts`.

### Timing and accuracy

- database update interval: 30 seconds
- preferred maximum accuracy: 100 metres
- multiple attempts for improved position
- movement-distance checks before updates

### Production tables written

Location history is inserted into:

- `incident_location_updates`

The main current location is also updated in:

- `incidents`

### Tracking persistence

Tracking state is stored in browser `localStorage` under:

- `emergency_tracking`

Tracking may resume after a page refresh if the incident remains active.

### Pilot isolation requirement

Pilot Mode requires either:

1. a pilot-specific location-tracking hook and pilot location table, or
2. a generic tracking service that routes to production or pilot storage based on the central mode.

Pilot tracking must never update `incidents` or `incident_location_updates`.

---

## 8. Production incident query layer

Verified in `src/hooks/queries/useIncidentsQuery.ts`.

### Reads

The query layer reads from:

- `incidents`

Supported operations include:

- paginated incident list
- campus-filtered list
- single incident
- active emergency list

### Writes

The query layer also provides:

- incident status update
- incident creation

Both mutations write to:

- `incidents`

### Query configuration

- page size: 50
- standard stale time: 30 seconds
- emergency refetch interval: 30 seconds

### Pilot architecture implication

A separate Pilot Mode query/service layer is required. Pilot data must not share the production React Query key `incidents`, otherwise pilot and production caches could contaminate each other.

---

## 9. Student dashboard

Verified in `src/pages/Dashboard.tsx`.

### Main student views

- Home
- My Cases
- Report
- Map
- Messages

### Important components

- `EmergencyReport`
- `ReportIncident`
- `MyCaseReports`
- `CampusMap`
- `StudentChat`
- `NewsFeed`
- `CampusCarousel`

### Other Supabase reads

The dashboard reads:

- `profiles` for campus
- `app_settings` for the welcome banner

### Pilot integration implication

Pilot Mode can reuse the visual patterns, but the production `EmergencyReport`, `ReportIncident` and `MyCaseReports` components must not be used without a safe service abstraction or pilot-specific wrappers.

---

## 10. Campus-admin portal

Verified in `src/pages/Security.tsx`.

### Role

The `security` role functions as the campus-admin/CPS office role.

### Current views

- Overview
- Incidents
- Analytics
- Students
- Announcements
- Communications
- Wi-Fi access points
- Settings

### Current production reads

The page reads:

- `profiles` filtered by campus
- `incidents` filtered by campus

Campus data is expected to be further restricted by RLS.

### Pilot requirement

A campus pilot dashboard must use the same campus identity from `profiles.campus`, but query only pilot tables and pilot metrics.

---

## 11. Super-admin portal

Verified in `src/pages/Admin.tsx`.

### Role

The `admin` role functions as the super-admin role.

### Current views

- Overview
- Incidents
- Escalation
- Analytics
- Announcements
- Staff communication
- Carousel management
- Campus-admin management
- Wi-Fi access points
- Campus office

### Pilot requirement

The super-admin Pilot Mode dashboard should be an additive route or additive view and must not mix pilot KPIs into production incident analytics.

---

## 12. Campus identifiers discovered

The inspected campus-admin and student pages use the following campus values:

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

Pilot tables and policies should reuse the production campus enum if safe and available.

---

## 13. Edge Functions discovered so far

Confirmed repository paths include:

- `supabase/functions/send-push-notification/index.ts`
- `supabase/functions/create-campus-admin/index.ts`
- `supabase/functions/reset-staff-password/index.ts`

The full Edge Function inventory is not yet complete.

Each function must be inspected for:

- authentication
- role verification
- campus restrictions
- production table writes
- external APIs
- required secrets
- notification or dispatch side effects

---

## 14. Initial production-risk findings

### Risk 1 — Direct table writes from UI components

Both standard reports and emergency reports write directly to `incidents`. Pilot Mode cannot safely rely on a visual banner alone; data-routing must be structurally separated.

### Risk 2 — Emergency location writes continue after submission

The tracking hook writes repeatedly to production tables and resumes from local storage. Pilot Mode requires a separate tracking storage key and separate write destination.

### Risk 3 — Shared query keys

Production incident hooks use the React Query key `incidents`. Pilot queries require distinct keys such as `pilot-incidents` or `pilot-reports`.

### Risk 4 — Role redirects may block pilot routes

`AuthContext` redirects by role. Approved `/pilot` routes must be explicitly preserved by redirect logic.

### Risk 5 — Production notification and escalation paths remain to be mapped

Push notifications, case escalation and case-status components must be audited before pilot implementation.

### Risk 6 — Pilot data cannot use only an `is_pilot` flag safely

The number of direct production queries and mutations already identified increases the risk of accidental mixing. Separate pilot tables remain the recommended architecture.

---

## 15. Remaining Phase 1 audit work

- Complete all routes and nested views
- Inventory every `.from(...)` call
- Inventory every `.rpc(...)` call
- Inventory every `supabase.functions.invoke(...)` call
- Inventory every storage bucket
- Inventory every Realtime channel
- Trace student case-status display
- Trace campus-admin incident updates
- Trace super-admin incident updates
- Trace case escalation
- Trace notification creation and delivery
- Inspect generated Supabase types and enums
- Inspect existing SQL migrations
- Inspect existing RLS policies where represented in repository files
- Inspect deletion paths
- Inspect export paths
- Inspect all Edge Functions
- Produce final table-to-file interaction matrix
- Produce final security risk register

---

## Phase decision

No Pilot Mode implementation should begin until the remaining Phase 1 audit items are completed and the exact production interaction matrix is documented.
