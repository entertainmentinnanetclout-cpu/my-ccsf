

## Plan: Complete TUT Color System Migration

### Overview
Migrate the entire CCSF app from a red-dominant color scheme to TUT institutional branding using navy blue (#002F6C) as primary, red only for destructive/emergency, and gold (#F2A900) as accent.

### Step 1: Update Global Theme Variables (`src/index.css`)

Replace all CSS custom properties in `:root` and `.dark` blocks:

**Light mode** - Convert hex to HSL:
- `--primary: 213 100% 21%` (navy #002F6C)
- `--primary-foreground: 0 0% 100%`
- `--foreground: 213 100% 21%`
- `--accent: 41 100% 47%` (gold #F2A900)
- `--accent-foreground: 0 0% 100%`
- `--destructive: 352 89% 43%` (red #C8102E)
- `--success: 142 72% 39%` (#16A34A)
- `--card: 220 20% 97%` (#F8F9FB)
- `--muted-foreground: 218 15% 35%` (#4A5568)
- `--ring: 213 100% 21%`

**Dark mode:**
- `--primary: 217 67% 37%` (#1A4FA3)
- `--background: 218 45% 8%` (#0B1220)
- `--card: 220 33% 11%` (#111827)
- `--destructive: 355 100% 61%` (#FF3B4A)
- `--success: 142 71% 45%` (#22C55E)
- `--muted-foreground: 216 24% 65%` (#A0AEC0)

**Update gradients:**
- `--gradient-primary`: navy-based gradient
- `--gradient-admin`: navy-based gradient
- `--shadow-glow`: navy-based glow
- All sidebar variables: navy-based

**Update `.admin-theme` and `.user-theme`:** Replace red gradients with navy/blue gradients. Dark variants use deep navy.

**Update `.gradient-border` and `.pulse-ring`:** Change red HSL to navy HSL.

### Step 2: Update Chart Colors in index.css
- `--chart-1: 213 100% 21%` (primary navy)
- `--chart-4` stays blue, others adjusted

### Step 3: Replace Hardcoded Colors in Components

**15+ files** with hardcoded Tailwind colors need updating. Status colors will use a consistent system:
- `bg-red-*` for rejected/emergency → `bg-destructive/…` + `text-destructive`
- `bg-green-*` for resolved/success → `bg-success/…` + `text-success` (add success Tailwind utility)
- `bg-amber/yellow-*` for pending/warning → `bg-warning/…` + `text-warning` (already exists)
- `bg-blue-*` for assigned/info → `bg-primary/…` + `text-primary`
- `bg-orange-*` for urgent/in-progress → `bg-warning`
- `bg-purple-*` → keep for differentiation (dual-band WiFi, etc.) or map to accent

**Files to update:**
1. `src/components/admin/AdminIncidents.tsx` - status colors
2. `src/components/admin/IncidentDetailsModal.tsx` - status badges
3. `src/components/admin/CampusAnalytics.tsx` - hardcoded hex chart colors + card backgrounds
4. `src/components/admin/CampusDashboard.tsx` - hex chart colors + trend colors
5. `src/components/admin/CampusOverview.tsx` - rejected status
6. `src/components/admin/CaseEscalation.tsx` - priority + status badges
7. `src/components/admin/LatestCases.tsx` - status colors
8. `src/components/admin/LiveLocationTracker.tsx` - live tracking red → destructive
9. `src/components/admin/MasterSyncButton.tsx` - disconnected state
10. `src/components/admin/Dashboard/CCTVStatus.tsx` - online/offline
11. `src/components/admin/Dashboard/AlertsPanel.tsx` - alert types
12. `src/components/admin/Dashboard/TrafficSummary.tsx` - hex chart colors
13. `src/components/admin/CaseUpdatesManager.tsx` - resolution color
14. `src/components/admin/metrics/GlassStatCard.tsx` - blue hardcoded
15. `src/components/admin/metrics/PremiumChartTooltip.tsx` - blue hardcoded
16. `src/components/admin/bento/widgets/QuickActionsWidget.tsx` - icon colors
17. `src/components/shared/NotificationBell.tsx` - notification type colors
18. `src/components/shared/SplashScreen.tsx` - red gradients → navy/primary
19. `src/components/shared/VirtualIncidentList.tsx` - status colors
20. `src/components/student/MyCaseReports.tsx` - status config hex + classes
21. `src/components/student/CampusMap.tsx` - WiFi band colors (keep purple for dual-band differentiation)
22. `src/pages/Office.tsx` - resolved status color
23. `src/pages/Judiciary.tsx` - resolution color
24. `src/pages/Dashboard.tsx` - gradient references
25. `src/pages/Profile.tsx` - user-theme already uses variables

### Step 4: Extend Tailwind Config

Add `success` and `warning` color utilities to `tailwind.config.ts` (already present). Verify `accent` is mapped. No structural changes.

### Step 5: Hex Chart Color Standardization

Replace all hardcoded hex in chart data arrays with CSS variable references:
- `#ef4444` → `hsl(var(--destructive))`
- `#22c55e` → `hsl(var(--success))`
- `#3b82f6` → `hsl(var(--primary))`
- `#f59e0b`/`#eab308` → `hsl(var(--warning))`

### What Does NOT Change
- No layout changes
- No logic changes
- No new components
- No routing changes
- Purple WiFi band colors stay (functional differentiation, not branding)

### Technical Summary
- **~25 files modified** (1 CSS, 1 config, ~23 components/pages)
- All changes are color-only (class names, hex values, CSS variables)
- Status system: Pending=gold, Active/Assigned=navy, Resolved=green, Emergency/Rejected=red

