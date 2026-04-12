

## Plan: Complete TUT Color Cleanup -- Fix All Remaining Hardcoded Colors

### Problem
The previous color migration left ~15 files with hardcoded Tailwind color classes (`bg-red-*`, `text-green-*`, `bg-blue-*`, `text-amber-*`, etc.) and inline red HSL gradients. The Auth page still has a red gradient background. These need to use the TUT design system variables.

### What Changes

**Critical fix -- Auth page red gradient:**
- `src/pages/Auth.tsx` line 190: Replace `hsl(0 72% 51%)` red gradient with navy gradient using `hsl(213 100% 21%)`
- Also fix `text-foreground` on white text (should be `text-white` since it's on dark bg)

**Critical fix -- PWA Install Prompt red gradients:**
- `src/components/shared/PWAInstallPrompt.tsx` lines 106, 164, 186: Replace all `hsl(0 72%)` red references with navy `hsl(213 100% 21%)`

**Critical fix -- Splash Screen:**
- `src/components/shared/SplashScreen.tsx` line 275: `bg-red-500/50` to `bg-primary/50`
- `text-neutral-*` classes to `text-muted-foreground` (lines 205, 228, 277, 493, 500, 553, 570)
- `text-cyan-500/20` glitch effect to `text-primary/20`

**Status color standardization (semantic variables):**

| File | Change |
|------|--------|
| `EmergencyCases.tsx` | `text-yellow-500` → `text-warning`, `text-blue-500` → `text-primary` |
| `CampusOverview.tsx` | `bg-blue-500/10 text-blue-600` → `bg-primary/10 text-primary`, `bg-amber-500/10 text-amber-600` → `bg-warning/10 text-warning` |
| `LiveLocationTracker.tsx` | `text-green-600` → `text-success`, `text-emerald-600` → `text-success`, `text-yellow-600` → `text-warning`, `text-orange-600` → `text-warning` |
| `Profile.tsx` | `text-green-500` → `text-success`, `text-yellow-500` → `text-warning` |
| `StudentChat.tsx` | `text-green-600` → `text-success`, `bg-green-400` → `bg-success` |
| `MyCaseReports.tsx` | All `bg-green-50/text-green-*` resolution sections → `bg-success/10 text-success`, `text-blue-600` → `text-primary`, `text-amber-*` blocks → `text-warning` variants |
| `ReportIncident.tsx` | `text-green-500/600` → `text-success`, `bg-green-50` → `bg-success/10`, `bg-gray-900` → `bg-card` |
| `EmergencyReport.tsx` | `bg-amber-*` → `bg-warning/10`, `text-amber-*` → `text-warning` |
| `CampusMap.tsx` | Speed test colors: `text-red-*` → `text-destructive`, `text-blue-*` → `text-primary`, `text-green-*` → `text-success`, `text-amber-*` → `text-warning`. Map landmarks: keep functional colors (yellow gates, blue buildings, gray parking, purple residences) as they serve map differentiation. WiFi band colors: `bg-blue-500` → `bg-primary` for 2.4GHz |
| `WifiAccessPointManager.tsx` | `text-green-500` → `text-success` |
| `StaffCommunication.tsx` | `text-blue-400` → `text-primary` |
| `AlertsPanel.tsx` | `text-amber-500` → `text-warning` |

**Toast component (keep as-is):**
- `src/components/ui/toast.tsx` uses `text-red-300` etc. inside `group-[.destructive]` context -- this is ShadCN default and acceptable.

### Files Modified (~15)
1. `src/pages/Auth.tsx`
2. `src/pages/Profile.tsx`
3. `src/components/shared/PWAInstallPrompt.tsx`
4. `src/components/shared/SplashScreen.tsx`
5. `src/components/admin/EmergencyCases.tsx`
6. `src/components/admin/CampusOverview.tsx`
7. `src/components/admin/LiveLocationTracker.tsx`
8. `src/components/admin/StaffCommunication.tsx`
9. `src/components/admin/Dashboard/AlertsPanel.tsx`
10. `src/components/admin/WifiAccessPointManager.tsx`
11. `src/components/student/MyCaseReports.tsx`
12. `src/components/student/CampusMap.tsx`
13. `src/components/student/ReportIncident.tsx`
14. `src/components/student/EmergencyReport.tsx`
15. `src/components/student/StudentChat.tsx`

### What Does NOT Change
- No layout or logic changes
- No new components
- `toast.tsx` ShadCN defaults left intact
- Map landmark differentiation colors (yellow/blue/gray/purple) kept for visual map clarity
- CSS variables in `index.css` already correct from previous migration

