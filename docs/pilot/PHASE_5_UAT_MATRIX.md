# My CCSF Controlled Pilot — Phase 5 UAT Matrix

**Branch:** `feature/phase-5-admin-release-gate`  
**Release state:** Draft and unmerged  
**Production deployment:** Prohibited until final approval  
**Supabase migration deployment:** Not performed by this branch

## Purpose

This matrix defines the evidence required before the Controlled Pilot can be approved for release. Automated CI and Vercel Preview smoke tests verify build integrity, route delivery, static assets and code-level role contracts. Authenticated live-data scenarios must be repeated after the Phase 5 migration is applied to the authorised Pilot Supabase environment.

## Role Matrix

| Role | Required scenario | Automated evidence | Preview/live evidence |
|---|---|---|---|
| New student | Controlled signup returns to `/pilot`; first-login guide opens; standard report; Emergency Test; case tracking; review submission; PDF download | Auth redirect, guide, report, review, PDF and route contracts in `test:phase5-release` | Repeat with a newly approved Pilot account after migration deployment |
| Returning student | Login returns to `/pilot`; existing cases and reviews load; guide preference follows profile | Auth, preference RPC and review regression gates | Repeat on a second browser/device after migration deployment |
| Campus security | Campus-only reports and reviews; student details; case open; respond/resolve/flag/hide; campus CSV export | RLS, campus-scope, handler and export assertions | Repeat for each of the ten campuses with authorised staff accounts |
| Super admin | Cross-campus reporting/reviews; comparisons/trends; full export; carousel/guide/review/PDF management | Admin route, content CRUD, analytics, export and storage-policy assertions | Repeat with the approved super-admin account after migration deployment |

## Device Matrix

| Device/profile | Viewport | Automated preview check | Authenticated live UAT |
|---|---:|---|---|
| Android Chrome | 360 × 800 | Responsive production build and SPA route smoke | Required after migration deployment |
| iPhone Safari | 390 × 844 | Responsive production build and SPA route smoke | Required after migration deployment |
| Tablet | 768 × 1024 | Responsive production build and SPA route smoke | Required after migration deployment |
| Desktop Chrome | 1440 × 900 | Build, lint, typecheck and direct-route smoke | Required after migration deployment |
| Desktop Edge | 1440 × 900 | Build, lint, typecheck and direct-route smoke | Required after migration deployment |

## Ten-Campus Routing Matrix

The following campus enum values must be tested with one student and one authorised security account after migration deployment:

1. Pretoria West (Main Campus) — `pretoria_west_main`
2. Soshanguve North — `soshanguve_north`
3. Soshanguve South — `soshanguve_south`
4. Ga-Rankuwa — `garankuwa`
5. Arcadia — `arcadia`
6. Arts — `arts`
7. Mbombela — `mbombela`
8. eMalahleni — `emalahleni`
9. Polokwane — `polokwane`
10. Giyani — `giyani`

For each campus, verify:

- standard and Emergency Test reports route only to that campus queue;
- campus security cannot read another campus's reports, reviews, screenshots or student details;
- the super admin can read all campuses;
- carousel campus targeting shows only eligible slides;
- review exports contain only the role's authorised scope.

## Release Evidence Required

The release owner must retain:

- successful `Phase 5 Release Gate` GitHub Actions run;
- successful Vercel Preview deployment and build logs;
- successful Preview HTTP checks for `/pilot/auth`, `/pilot`, `/pilot/reviews`, `/pilot/resources`, `/security/pilot`, `/admin/pilot`, `/admin/pilot/content`, and the static Safety PDF;
- completed authenticated role/device matrix after the Phase 5 migration is applied;
- completed ten-campus routing matrix;
- confirmation that no production incident, feedback, carousel, notification or case-update table is read or written by Pilot services;
- written final approval before merge or production publication.

## Approval Rule

Phase 5 code completion and Preview validation do not authorise production release. Final approval requires the deployed Supabase migration plus authenticated live-data UAT across all roles and campuses.
