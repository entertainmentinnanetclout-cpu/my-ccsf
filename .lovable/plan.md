

# Comprehensive App Update Plan: Fixes, Upgrades, and Finalization

## 1. Layout Conflict Fix (Critical Bug)

The `Layout` component wraps ALL routes with a container, padding, and a floating `Navigation` dropdown menu. However, Dashboard, Admin, Security, Office, Judiciary, and Profile pages all have their own full-screen layouts with sticky headers and navigation. This causes:
- Double container/padding wrapping
- A floating hamburger menu overlapping the page headers
- Broken full-width layouts

**Fix:** Remove the `Layout` wrapper from routes that have their own layout, or make `Layout` a pass-through (no container/navigation) for authenticated pages. The simplest approach is to separate public routes (Index, Auth, NotFound) from app routes that manage their own layout.

---

## 2. Replace TUT Logo with CCSF Logo on Auth and All Headers

The auth page and all dashboard/admin/security headers still use `tut-logo.png`. Since the app now has a proper CCSF shield logo (`ccsf-logo.png`), all references to `tutLogo` should be replaced with the CCSF logo for consistent branding.

**Affected files:**
- `src/pages/Auth.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Admin.tsx`
- `src/pages/Security.tsx`
- `src/pages/Office.tsx`
- `src/pages/Judiciary.tsx`
- `src/pages/Profile.tsx`
- `src/pages/ProfileCompletion.tsx`

---

## 3. NotificationBell -- Use React Query Hook Instead of Direct Supabase Calls

The `NotificationBell` component makes its own direct Supabase calls and sets up its own real-time channel, bypassing the React Query caching layer that was already built (`useNotificationsQuery`). This wastes connections and duplicates data fetching.

**Fix:** Refactor `NotificationBell` to use `useNotificationsQuery`, `useUnreadNotificationsCount`, `useMarkNotificationReadMutation`, and `useMarkAllNotificationsReadMutation` from the query hooks.

---

## 4. Office Page -- Use React Query and Pagination

The `Office.tsx` page loads ALL incidents without pagination and sets up its own real-time channel. It should use the `useIncidentsQuery` hook with pagination and filtering.

---

## 5. Judiciary Page -- Use React Query

The `Judiciary.tsx` page makes direct Supabase calls. Refactor to use React Query for caching and consistency.

---

## 6. Dashboard -- Use React Query for Profile Fetch

`Dashboard.tsx` makes a direct Supabase call to get the user's campus. This should use `useCurrentUserProfileQuery()` from the hooks.

---

## 7. Improve 404 Page

The current `NotFound` page is very plain. Update it with the CCSF branding, shield logo, and a proper "Return to Safety" CTA that matches the app's design language.

---

## 8. Fix Navigation Component for Role-Based Links

The `Navigation` component renders a floating dropdown menu on all pages. Since each dashboard has its own navigation, this component is redundant for authenticated users. It should only show on public pages or be removed entirely in favor of the per-page navigation.

---

## 9. Add Error Boundaries

Currently there are no error boundaries. If any component crashes, the entire app goes blank. Add a global error boundary with a user-friendly fallback that shows the CCSF logo and a "Something went wrong" message with a retry button.

---

## 10. Service Worker Cache Update

The `public/sw.js` should be reviewed and updated to properly cache the new PWA icons and assets.

---

## Technical Summary

| Item | Type | Priority | Files Changed |
|------|------|----------|---------------|
| Layout conflict fix | Bug fix | Critical | App.tsx, Layout.tsx |
| Replace TUT with CCSF logo | Branding | High | 8 page files |
| NotificationBell React Query | Performance | High | NotificationBell.tsx |
| Office page optimization | Performance | Medium | Office.tsx |
| Judiciary React Query | Performance | Medium | Judiciary.tsx |
| Dashboard profile query | Performance | Low | Dashboard.tsx |
| 404 page upgrade | UX | Medium | NotFound.tsx |
| Remove redundant Navigation | Bug fix | High | Layout.tsx, Navigation.tsx |
| Error boundaries | Reliability | High | New ErrorBoundary.tsx, App.tsx |
| Service worker update | PWA | Low | sw.js |

