## Plan: Office Admin Role, Carousel Fix, Mobile Bottom Nav

### 1. Assign [pretoriaadmin@ccsf.ac.za](mailto:pretoriaadmin@ccsf.ac.za) as Pretoria Office Admin

The user exists as `pretoriaadmin@ccsf.ac.za` (ID: `918810a6-3a28-447d-81a1-8f3384f090f5`) with only a `student` role and no campus set.

**Migration will:**

- Remove the `student` role
- Add `security` role (campus admin)
- Insert into `admin_access` with campus `pretoria_west_main`
- Update profile campus to `pretoria_west_main`

### 2. Fix Carousel Images Not Showing

Some carousel images in the database use local asset paths like `/src/assets/campus-building.jpg` which don't resolve in production. These need to be either:

- Removed (they're placeholder entries for campuses that don't have real uploaded images yet), OR
- Updated to use placeholder images that actually load

**Fix:** Update the `CampusCarousel` component to filter out images with broken local paths (those starting with `/src/assets/`), and update the `onError` handler to gracefully hide broken images. Also update the database records to mark those placeholder entries as inactive.

make sure its fetching images from super admin setup

### 3. Mobile Responsive with Fixed Bottom Navigation

Replace the current `MobileNavMenu` (bottom sheet popup) with a persistent fixed bottom navigation bar on mobile for both the Student Dashboard and Admin pages.

**Create `src/components/shared/MobileBottomNav.tsx`:**

- Fixed position at bottom of screen (`fixed bottom-0`)
- Shows 5 nav items with icons and labels
- Active state highlighting
- Safe area padding for notched phones (`pb-safe`)
- Glass morphism background

**Update `src/pages/Dashboard.tsx`:**

- Replace `MobileNavMenu` with the new `MobileBottomNav`
- Add `pb-20` padding to main content to prevent bottom nav overlap
- Ensure header stays above content with proper z-index

**Update `src/pages/Admin.tsx`:**

- Same bottom nav treatment for admin dashboard on mobile

### Technical Details

**Files to create:**

- `src/components/shared/MobileBottomNav.tsx`
- Migration SQL for role assignment

**Files to modify:**

- `src/pages/Dashboard.tsx` - bottom nav + content padding
- `src/pages/Admin.tsx` - bottom nav + content padding
- `src/components/student/CampusCarousel.tsx` - filter broken image URLs