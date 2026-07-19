# CCSF Phase 7 — Authentication, PWA and Institutional Consistency Complete

**Completion date:** 19 July 2026  
**Release-candidate branch:** `feature/ccsf-phases-3-8-release-candidate`  
**Pull request:** #27 — draft and unmerged  
**Production publication:** not authorised

This record closes the authoritative Phase 7 scope from Issue #10.

## Authentication standardisation

Official and Controlled Pilot access now use the same CCSF/TUT institutional authentication system.

Implemented:

- one shared CCSF/TUT authentication frame for official and Pilot access;
- canonical CCSF and separate TUT light/dark branding on both login surfaces;
- deterministic role-aware destinations for students, campus-security staff and super-admins;
- sanitised official and Pilot deep-link restoration;
- no navigation side effects inside `AuthContext`;
- fail-closed role and profile verification;
- recoverable account-verification errors with retry and sign-out controls;
- stale asynchronous identity-response protection;
- official login, student registration, recovery and password-update workflows;
- the previously missing password-reset completion step using `supabase.auth.updateUser`;
- official recovery links for both normal and Pilot users;
- canonical campus options for student registration;
- student-only self-registration, with security and admin roles remaining administratively assigned;
- incomplete student profiles retain their approved destination through profile completion.

## PWA and cache replacement

The PWA has been upgraded from the legacy red, force-refreshing shell to a controlled institutional release model.

Implemented:

- canonical navy `#002F6C` manifest and mobile browser identity;
- full `My CCSF — Campus Community Safety Forum` application metadata;
- South African locale and device safe-area metadata;
- standard and maskable native-size CCSF icons;
- student-dashboard and incident-report application shortcuts;
- versioned `phase7-2026-07-19-v4` cache namespace;
- deletion of every previous `my-ccsf-*` cache generation during activation;
- network-first navigation with navigation preload and an offline application-shell fallback;
- stale-while-revalidate handling for same-origin static resources;
- no forced `skipWaiting` during installation;
- an explicit update-ready prompt that activates the waiting worker and reloads only after controller replacement;
- update checks on load, hourly while open, and when the application returns to the foreground;
- accurate installation messaging without claiming full offline report submission;
- suppression of installation prompts on official and Pilot authentication screens;
- removal of the unused background incident-sync placeholder.

## Institutional interface consistency

Implemented:

- replacement of the remote-video/audio splash with a short local institutional startup screen;
- no fabricated camera, response-time or coverage statistics;
- reduced-motion support and immediate skip control;
- canonical CCSF/TUT hierarchy in official authentication, Pilot authentication, Pilot headers/footers and the student portal;
- verified AuthContext profile reuse in the student portal instead of a duplicate profile query;
- floating public navigation limited to the public home page so it cannot overlap portal headers;
- mobile bottom navigation no longer truncates portals after five items;
- horizontal, safe-area-aware mobile access to all campus and super-admin sections, including Analytics, Governance and Audit;
- accessible active-page, loading, error and update semantics.

## Automated verification

GitHub Actions run **#551** passed:

- strict `npm ci`;
- Pilot production-isolation verification;
- Phase 3 routing verification;
- core product hardening verification;
- Phase 4 Student and Phase 5 Campus-Security parity verification;
- Phase 6 Super-Admin parity verification;
- Phase 7 authentication, PWA and institutional-consistency verification;
- transparent canonical CCSF/TUT branding verification;
- official/Pilot student-home parity verification;
- TypeScript type-check;
- ESLint;
- fail-closed production build;
- approved Pilot Preview build.

The permanent Phase 7 gate checks authentication ownership, deep-link safety, password recovery, canonical campuses, shared branding, PWA metadata, cache replacement, service-worker update controls, installation messaging, splash integrity, dark-mode hierarchy and complete mobile navigation.

## Supabase state

Phase 7 required no schema or policy migration. Existing role, profile and Pilot RLS controls remain authoritative.

The Supabase security adviser state remains unchanged: the only warning is the existing project-level leaked-password-protection setting. No Phase 7 database-security finding was introduced.

## Release control

Phase 7 authorises Phase 8 UAT only. It does **not** authorise:

- merging PR #27;
- publishing the release candidate to production;
- enabling external emergency dispatch;
- bypassing end-to-end role, device, dark-mode, install/update and regression UAT;
- changing the approved CCSF/TUT colour or logo hierarchy.
