# Phase 2.5 complete — supplied logo and student home parity

## Outcome

The user-supplied `Campus safety forum logo design(1).png` is now the single CCSF source of truth. No generated CCSF placeholder remains in production assets, and the application still pairs the CCSF mark with the existing light- and dark-theme TUT logos without changing the application colour system.

The production and Pilot student dashboards now share the same home-content component:

- campus carousel;
- configurable welcome banner; and
- campus news feed.

The Pilot keeps its isolated reports, cases, locations, notifications, and metrics below that shared content.

## Carousel repair

- Campus image requests use a safely encoded campus list instead of a raw filter string.
- Broken `/src/...` database paths are rejected from the UI.
- Failed or unavailable campus images fall back to the checked-in CCSF + TUT institutional slide, so the carousel never disappears.
- The eMalahleni record now uses that deployable institutional slide until a campus photograph is uploaded.
- A database constraint prevents future `/src/...` carousel paths.

## Merge gates

- `npm run test:branding`
- `npm run test:pilot-isolation`
- `npm run test:student-home`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- browser verification of the production and Pilot student home dashboards in light and dark modes
