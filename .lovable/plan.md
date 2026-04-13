

## Plan: White-Dominant TUT Design System Migration

### Problem
Every page currently uses full-screen navy blue gradient backgrounds (`admin-theme`, `user-theme`, `bg-gradient-primary`). The reference image and TUT website show a **white-dominant** design where blue is used only for headers/icons/accents, not as page backgrounds.

### Core Change
Replace all full-page navy gradient backgrounds with white/light grey (`bg-background`), keeping navy headers intact. Update footer text colors that will break on white backgrounds.

### Color System Update

**Updated values in `src/index.css`:**
- `--primary: 216 100% 28%` (#003A8F — slightly lighter navy per spec)
- `--destructive: 352 84% 50%` (#E31C3D)
- `--accent: 43 100% 48%` (#F4B400)
- `--background: 220 20% 97%` (#F5F7FA) — light grey instead of pure white
- `--card: 0 0% 100%` (#FFFFFF) — white cards on grey bg
- `--foreground: 0 0% 10%` (#1A1A1A) — near-black text
- `--muted-foreground: 220 9% 46%` (#6B7280)

**Dark mode adjustments:**
- `--background: 222 47% 11%` (#0F172A)
- `--card: 217 33% 17%` (#1E293B)

**`.admin-theme` and `.user-theme`:** Change from navy gradients to just `background: hsl(var(--background))` — let the page be white/light, not navy.

**Gradient variables:** Keep `--gradient-primary` and `--gradient-admin` for use on headers only, not full-page backgrounds.

### Page Background Changes (~8 files)

| File | Current | New |
|------|---------|-----|
| `Dashboard.tsx` | `bg-gradient-primary user-theme` | `bg-background` |
| `Admin.tsx` | `bg-gradient-admin admin-theme` | `bg-background` |
| `Security.tsx` | `bg-gradient-admin admin-theme` | `bg-background` |
| `Office.tsx` | `bg-gradient-admin admin-theme` | `bg-background` |
| `Judiciary.tsx` | `bg-gradient-admin admin-theme` | `bg-background` |
| `Profile.tsx` | `bg-gradient-primary user-theme` | `bg-background` |
| `ProfileCompletion.tsx` | `bg-gradient-primary user-theme` | `bg-background` |
| `Index.tsx` | `bg-gradient-primary` | `bg-background` |
| `Auth.tsx` (line 183) | `bg-gradient-primary` | `bg-background` |

### Footer Text Color Fixes
Currently footers use `text-primary-foreground` (white) which was visible on navy backgrounds. On white backgrounds this becomes invisible. Change to `text-primary` (navy on white).

**Files:** `Admin.tsx`, `Security.tsx`, `Dashboard.tsx`

### Dashboard Footer/Content Text
The student Dashboard footer currently uses `text-white` classes for the "Powered by" text and `bg-white/10` glass effect — these will be invisible on white. Change to `text-muted-foreground` and `bg-muted/50`.

### Auth Page Background
Line 190 has inline `style={{ background: 'linear-gradient(...)' }}`. Keep this as the one exception — Auth login page can retain the navy gradient for visual impact, OR change to white. Per reference image, the auth area appears to use a clean white card on a subtle background.

**Decision:** Keep Auth page with navy gradient (it's a single login screen, not a working dashboard).

### Card Styling
Cards currently use `bg-card` which is `#F8F9FB` (very light grey). With new system, background becomes `#F5F7FA` and cards become `#FFFFFF` — creating proper card-on-background contrast with soft shadows.

### What Does NOT Change
- Header styling (stays `bg-primary` with white text) 
- Button variants
- Status color system
- Component layouts
- Navigation structure
- MobileBottomNav styling
- No new components

### Files Modified (~10)
1. `src/index.css` — CSS variables + theme classes
2. `src/pages/Dashboard.tsx` — background + footer
3. `src/pages/Admin.tsx` — background + footer
4. `src/pages/Security.tsx` — background + footer
5. `src/pages/Office.tsx` — background
6. `src/pages/Judiciary.tsx` — background
7. `src/pages/Profile.tsx` — background
8. `src/pages/ProfileCompletion.tsx` — background
9. `src/pages/Index.tsx` — background
10. `src/pages/Auth.tsx` — loading state background

