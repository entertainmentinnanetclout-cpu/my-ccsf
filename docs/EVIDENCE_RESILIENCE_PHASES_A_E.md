# CCSF Evidence Resilience — Phases A to E

## Scope

This delivery strengthens official and Controlled Pilot reporting without changing the production/Pilot data boundary or enabling external emergency dispatch.

### Phase A — Draft continuity and mobile controls
- Official and Pilot report fields persist locally for 24 hours.
- Selected evidence persists privately in IndexedDB for the same period.
- Dedicated photo, video, gallery and document controls replace an ambiguous single input.
- The active official report, Pilot dashboard tab and Pilot scenario survive mobile process interruption.

### Phase B — Mobile format processing
- JPG, PNG, WebP, MP4 and PDF remain supported where applicable.
- HEIC/HEIF photographs are accepted and converted to JPEG when the device browser can decode them.
- Large images are resized and compressed while retaining readable evidence quality.
- SHA-256 checksums are recorded for evidence integrity.
- Per-file preview, size, progress, failure and retry state are visible.

### Phase C — Evidence-first and resumable submission
- Evidence uploads use Supabase Storage's TUS endpoint in 6 MB chunks.
- Upload offsets and object paths remain stable across mobile interruption and token refresh.
- Required-evidence scenarios cannot create a visible report until private evidence objects are verified.
- Official and Pilot finalisation use database functions that create the case, metadata and receipt atomically.

### Phase D — Explicit offline queue and receipts
- Non-emergency reports may be stored on the current device for up to 24 hours.
- Offline reports remain clearly marked as undelivered until the student reconnects and chooses **Send now**.
- Emergency reports fail closed when offline and direct the student to immediate telephone/emergency channels.
- Successful official and Pilot reports produce a printable formal receipt.

### Phase E — Evidence governance and Pilot analytics
- Private evidence previews and downloads use short-lived signed URLs.
- Every access is recorded with the staff member, role, campus, case, time and action.
- Downloads require a stated operational reason.
- Pilot super-admins receive evidence success rate, duration, device/browser, network and recurring-error analytics.

## Database changes

- `evidence_submission_drafts`
- `submission_receipts`
- `evidence_access_audit`
- `incident_media.original_filename`
- `incident_media.checksum`
- `create_evidence_submission_draft(...)`
- `finalize_official_evidence_submission(...)`
- `finalize_pilot_evidence_submission(...)`
- hardened private Storage policies for pre-finalisation evidence

## Security boundaries

- Production reports remain in production incident tables.
- Pilot reports remain in isolated Pilot tables.
- Pilot reporting never invokes production notifications, case updates or external dispatch.
- Offline emergency reporting never claims delivery.
- Browser queues and evidence drafts expire after 24 hours.
- The evidence access service verifies ownership, role and campus before issuing a signed URL.

## Release gates

- TypeScript
- ESLint
- Mobile evidence/session continuity gate
- Evidence resilience A–E gate
- Pilot routing and isolation gates
- Safety Mobility gate
- Production and approved Pilot builds
- Android Chrome/PWA, iPhone Safari/web app and desktop manual UAT

## Rollback

Application rollback: redeploy the previous `main` deployment.

Database rollback is additive and should normally be performed by disabling the new client paths rather than deleting receipt or audit evidence. The new tables and RPCs can remain dormant without changing existing production/Pilot reporting. Do not remove audit history after the feature has been used.
