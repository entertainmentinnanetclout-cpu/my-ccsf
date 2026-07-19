# Phase 1 Complete — Supabase Reconciliation and Health

Completed: 19 July 2026

## Result

- Recovered **119** exact live migration statement sets into `supabase/migrations`.
- Reconciled **208,894 SQL bytes** under their original authoritative timestamps.
- Modified remote migration history: **No**.
- Replayed production migrations: **No**.
- Active Edge Functions verified: **11**.
- Deployed/repository files compared: **27**, exact matches: **27**.
- All active Edge Functions: **JWT verification enabled**.
- Phase 3, Phase 5, and Phase 6 read-only database verification suites: **Passed**.
- Security adviser: **1 warning, 0 critical/high findings**.
- Performance adviser: **68 informational unused-index notices; 0 warnings/errors**.

## Migration reconciliation

The authoritative SQL and per-version byte/MD5 register are recorded in [phase-1-supabase-migration-reconciliation.md](phase-1-supabase-migration-reconciliation.md). Supabase CLI compares local and remote timestamps, so blank legacy migration names use the local suffix `remote_commit` without changing their authoritative version.

Merge-triggered Supabase branch sync is the last infrastructure signal. The pre-merge `main` status remains `MIGRATIONS_FAILED` because the restored files are intentionally not present on `main` until this reviewed PR merges.

## Edge Function parity

| Function | Version | Status | JWT | Deployed bundle SHA-256 |
|---|---:|---|---|---|
| `send-push-notification` | 7 | ACTIVE | Yes | `f374363dec190f49dfdd95a208eef14e869aec2711164e14ceed28876ef98fbe` |
| `create-campus-admin` | 7 | ACTIVE | Yes | `30c4600301ea1fa26c286cf0dae62e7e2a8a468e5d748f51895a9ecae8736e7c` |
| `reset-staff-password` | 4 | ACTIVE | Yes | `031397a04add7cfb257d61ac584b37cfb7cf757ce047df632701c2febc82900f` |
| `pilot-create-session` | 2 | ACTIVE | Yes | `77b2e0b42b96e15334bf38abb54465c9c8d311fcf1bf685a48710dba069fde71` |
| `pilot-submit-report` | 2 | ACTIVE | Yes | `f49aa7849b6021a688eaac7cd4fbae30bfec0f7c5fc76062973b783b8069242e` |
| `pilot-transition-status` | 3 | ACTIVE | Yes | `30e89763f3c10ff36a04856fdfe8ceadf336b55cddc89886d1439d923509a212` |
| `pilot-create-notification` | 3 | ACTIVE | Yes | `58e230b88d7b569e1335daa0437b3bb71656c287ce0da457fa2f2c7a6a75833e` |
| `pilot-delete-report` | 3 | ACTIVE | Yes | `dfda6819dbd445a580ed03aef6acc5baf3ef9830734c5a8a584e7be3503bcafb` |
| `pilot-session-cleanup` | 2 | ACTIVE | Yes | `bafaafc86cfb867f338bf571ae675d7d47b669e1f2ce1f250b9f5bdfd85c2b0b` |
| `pilot-cleanup` | 2 | ACTIVE | Yes | `ec2f3ffa98d737bc7d13a8a643c17a6f4615a8ca7ce18dcb42d3553a4550f97c` |
| `pilot-export-results` | 2 | ACTIVE | Yes | `1d6f113f615efdf688e6a96658397b2d86b367e450ea40f9453b792d45b92a96` |

The five operational Pilot functions were redeployed from the checked-in reviewed source. The three unused diagnostic responders were converted to explicit `410 Gone` compatibility endpoints and remain unreferenced by application services.

## Database controls verified

- 12 Pilot tables, all with RLS enabled.
- 27 Pilot table policies.
- Zero anonymous Pilot table grants.
- Zero public Pilot `SECURITY DEFINER` functions.
- Zero forbidden production-incident foreign keys or function references.
- Four expected Realtime tables.
- Private attachment bucket, 10 MB limit, restricted MIME list.
- Two Pilot Storage policies.
- Service-only finalisers denied to `authenticated` and allowed to `service_role`.
- Aggregate results view uses `security_invoker`.

## Adviser disposition

The sole security warning is Supabase Auth leaked-password protection being disabled. It is retained as a formally accepted plan/configuration limitation and must be enabled when the active project tier exposes that control. See the [Supabase password-security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Unused-index notices are retained until representative Pilot traffic exists; removing intended relationship and queue indexes before usage statistics mature would be premature.

## Completion gate

Phase 1 is complete when:

1. GitHub QA passes at the final commit;
2. the reviewed PR is merged to `main`;
3. Supabase branch action re-runs and no longer reports missing remote migration versions.
