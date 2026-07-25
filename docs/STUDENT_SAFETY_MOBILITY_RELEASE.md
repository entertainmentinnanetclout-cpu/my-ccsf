# Student Safety Mobility Release Contract

Release branch: `fix/public-pilot-student-experience`

## Student experience

- In-Transit safety sessions for Uber, Bolt, taxi, bus, private vehicle and walking journeys.
- Night Travel safety check-ins.
- Track This Phone last-known-location sessions.
- Campus Safety Radar with glowing rings and tappable opted-in student profiles.
- Organised student navigation: Home, My Cases, Report, Safety and Support.
- Existing campus/residence carousel retained.
- Official Student Portal and Pilot remain directly navigable.

## Location and reporting contract

- Location collection is opt-in and can be stopped by the student.
- Radar visibility defaults to off.
- Approximate Radar limits precision; exact Radar requires explicit consent.
- Stale Radar locations disappear after 15 minutes.
- Client-supplied campus values cannot override the authenticated student's verified profile campus.
- An In-Transit or Night Travel alert creates an official incident and connects subsequent updates to the existing incident live-location trail.
- The existing connected CampusMap and real Google Maps direction links are retained unchanged.
- The traced Pretoria Campus structure map is a separate secondary reference.

## Platform limitations

- A browser application cannot locate a powered-off phone.
- Browser location may stop when the app is closed or when Android/iOS restricts background execution.
- Safety Mobility does not replace 112, SAPS 10111, verified CPS procedures or medical emergency services.

## Brand and PWA contract

- CCSF and TUT remain separate, correctly proportioned institutional assets.
- Splash branding is presented on a premium white panel for legibility.
- Installation and notification icons use verified opaque white PNG assets.
- The PWA provides a direct Safety Mobility shortcut.

## Release verification

Every Vercel build runs `scripts/verify-safety-mobility-release.mjs` before generating documents and compiling the application. The gate verifies database isolation, campus scope, consent, Radar privacy, official incident handoff, map preservation, PWA assets and safety limitation messaging.
