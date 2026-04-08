## Important Security Note

**Displaying passwords on a dashboard is not possible and would be a critical security vulnerability.** Supabase (and all modern systems) store passwords as one-way hashes -- they cannot be retrieved or displayed. This is by design.

Instead, I will implement a **password reset management system** where the super admin can trigger password resets for staff accounts, so officers who forget their passwords can get a reset link sent to their email

## Plan

### 1. Assign `phutiadmin@ccsf.ac.za` as Super Admin

- Use the Supabase insert tool to:
  - Look up the user by email in `profiles`
  - Delete any `student` role from `user_roles` for that user
  - Insert `admin` role into `user_roles` for that user

### 2. Add Staff Password Reset Management to Admin Dashboard

- Add a new "Staff Management" or enhance the existing "Admins" tab in Admin.tsx
- In `CampusAdminManager.tsx`, add a "Reset Password" button next to each staff member
- When clicked, call `supabase.auth.admin` or use an edge function to send a password reset email to that staff member's email address
- Create a small edge function `reset-staff-password` that uses the Supabase service role key to call `auth.admin.generateLink()` for password reset, since client-side cannot trigger resets for other users

### 3. Add Campus Office Navigation to Super Admin Dashboard

- Add a new nav item "Campus Office" to Admin.tsx nav items array (using `FileText` or `Building` icon)
- When selected, render the `Office` component (or an embedded version) within the admin dashboard
- This gives super admins direct access to the campus office view without navigating away

### Technical Details

**Files to modify:**

- `src/pages/Admin.tsx` -- Add "Campus Office" nav item and render Office content
- `src/components/admin/CampusAdminManager.tsx` -- Add "Reset Password" button per staff member
- Create `supabase/functions/reset-staff-password/index.ts` -- Edge function to trigger password reset emails using service role key
- Run SQL data operations to fix `phutiadmin@ccsf.ac.za` roles

**Edge function approach for password reset:**

- Accepts `{ email: string }` in request body
- Validates caller is a super admin (via JWT)
- Uses `supabase.auth.admin.generateLink({ type: 'recovery', email })` to create reset link
- Sends the reset email automatically via Supabase Auth