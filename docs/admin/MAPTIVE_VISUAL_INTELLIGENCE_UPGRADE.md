# CCSF Admin Visual Intelligence Upgrade

## Objective

Upgrade every operational administration dashboard with a consistent, interactive visual command layer inspired by established data-visualization practices: geographic grouping, bubble magnitude, heat concentration, ordered trends, clear filtering and direct drill-down actions.

The implementation is native to CCSF. It does not embed Maptive, transmit CCSF records to Maptive or depend on a third-party visualization account. Existing Supabase, MasterSync and Pilot realtime sources remain the source of truth, while Recharts and CCSF UI components render the visual layer internally.

## Covered dashboards

1. Institution super-admin (`/admin`)
2. Campus-security administration (`/security`)
3. Pilot super-admin (`/admin/pilot`)
4. Pilot campus-security administration (`/security/pilot`)

## Shared visual system

`LiveOperationsVisuals` normalizes operational records into one reusable contract and renders:

- live data status and record count;
- period, campus, status and category filters;
- campus risk bubble map;
- response-stage operational flow;
- total and critical incident trend;
- category concentration ranking;
- seven-day time-of-day heatmap;
- critical action list;
- queue, analytics, refresh and record drill-down actions.

Visual selections are functional controls. Selecting a campus bubble, workflow stage, category or period updates the full visual command view rather than acting as decoration.

## Live data behaviour

- Production dashboards consume the existing `MasterSyncContext` incident stream.
- Pilot dashboards consume isolated `pilot_*` tables through their existing realtime subscriptions and 15-second fallback refresh.
- Manual refresh remains available.
- Pilot visuals remain isolated from production incidents.
- Campus-security dashboards remain constrained to the authenticated campus.

## UX principles

- Preserve existing CCSF and TUT branding and colour tokens.
- Keep the first screen operationally useful rather than chart-heavy.
- Use progressive disclosure: summary first, drill-down second.
- Prioritise readable campus labels, category names and workflow stages.
- Make charts mobile responsive and keyboard-accessible where actions are present.
- Keep critical records directly reachable from the visual layer.

## Release verification

Run:

```bash
npm run test:admin-visuals
npm run typecheck
npm run lint
npm run build
```

The visual regression test verifies all four administration surfaces, campus isolation, Pilot isolation, live actions and the absence of external visualization data transfer.
