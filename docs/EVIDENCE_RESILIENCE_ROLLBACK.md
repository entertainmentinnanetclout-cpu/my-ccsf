# Evidence Resilience Rollback Protocol

## Application rollback

1. Stop the current Vercel promotion or redeploy the last approved `main` deployment.
2. Keep the database migrations in place. They are additive and dormant when the new client paths are not used.
3. Do not delete submission receipts or evidence-access audit history.
4. Disable or roll back the new Edge Function versions only after the previous frontend deployment is active.

## Edge Function rollback

- `pilot-submit-report`: restore the immediately preceding deployed version if the new evidence-finalisation path fails.
- `secure-evidence-link`: staff evidence access can temporarily fall back to the previous signed-link path only under explicit technical approval; record that audit coverage is temporarily degraded.
- `evidence-submission-cleanup`: disable invocation rather than deleting drafts manually while an incident is investigated.

## Database containment

The following additive objects may remain safely in place during application rollback:

- `evidence_submission_drafts`
- `submission_receipts`
- `evidence_access_audit`
- evidence draft and receipt RPCs
- additive evidence metadata columns

Do not drop these objects after use because they may contain operational receipts, audit evidence or pending privacy-cleanup records.

## Storage containment

- Do not make `incident-media` or `pilot-report-attachments` public.
- Do not weaken campus or owner policies to recover access.
- Expired unfinalised draft objects must be removed through the governed cleanup function.
- Finalised evidence follows the existing case retention process.

## Release authority

A green build authorises review, not production publication. Manual mobile UAT and explicit operational approval remain required before the release is considered complete.
