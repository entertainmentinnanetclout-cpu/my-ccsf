# Phase 1.5 — Accepted Operational Constraints

## 1. Supabase leaked-password protection

Deferred because the current Supabase plan does not provide the feature. This warning is accepted and excluded from the Phase 1.5 and Phase 2 gates.

Compensating controls include twelve-character staff passwords, restricted staff creation, JWT-verified privileged functions and super-admin-only password-reset management.

## 2. Web Push VAPID credentials

The application and Edge Function now support real Web Push, but VAPID credentials have not been configured.

Until configured:

- the browser does not advertise push support;
- subscription attempts explain that notifications are not configured;
- the Edge Function returns HTTP 503 and `delivery_status: not_configured`;
- the system does not report false delivery success.

## 3. Official campus CPS numbers

The central `campus_emergency_contacts` table and backend-driven interface are ready. No contact number is displayed until it has been institutionally verified and entered as active data.

## 4. Unused-index adviser notices

The production database currently has insufficient traffic for representative index-usage statistics. Operational and foreign-key indexes are retained and will be reviewed after meaningful pilot or production traffic exists.
