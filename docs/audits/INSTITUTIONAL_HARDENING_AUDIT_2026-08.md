# My CCSF Institutional Hardening Audit — August 2026

## Phase 1: Security and mobile reliability

This release addresses verified implementation defects before any visual 3D or map expansion:

- protects incident status, assignment, resolution and campus routing from student-side mutation;
- derives official case campus from the authenticated profile;
- validates report payload lengths, coordinates, signatures and evidence manifests on the server;
- routes emergency creation and live location updates through vetted RPCs;
- makes the emergency control safe-area aware and touch-accessible on iOS and Android;
- normalises evidence MIME types and supports MP4, MOV/QuickTime, WebM and 3GP mobile video evidence;
- raises the private evidence video limit to 25 MB while retaining 10 MB for images and PDFs;
- fixes anonymous reports disappearing from My Cases;
- improves avatar conversion, touch target size and stale-object cleanup;
- rejects poor-quality fixes for exact Campus Radar sharing;
- removes the duplicate CPS mark from the Safety Quest header;
- removes dormant anonymous brand-transfer storage policies;
- adds missing evidence and safety-mobility indexes.

## Deferred to Phase 2

- first-party interactive Campus Safety Radar map;
- verified Pretoria West building/office/route data model;
- accuracy circles, safety zones, internal navigation and 2.5D/3D building overlays;
- removal of generic placeholder landmarks and external Google map dependencies.

## Deferred to Phase 3

- institutional case-card and timeline redesign;
- private/signed avatar delivery architecture;
- unified high-resolution asset pipeline, adaptive media and premium motion system;
- full accessibility and cross-device visual regression suite.
