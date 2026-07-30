# CCSF Evidence Resilience — Manual UAT Matrix

Automated source, TypeScript, lint and build gates are mandatory. This matrix is the final device acceptance gate before formal release approval.

| Platform | Environment | Evidence source | Interruption | Expected result |
|---|---|---|---|---|
| Android Chrome | Official | Rear camera | Switch apps before returning | Same report, fields and selected evidence remain available |
| Android Chrome | Official | Gallery | Lock/unlock device | Evidence preview appears and upload resumes if interrupted |
| Installed Android PWA | Official | Video | Background app during upload | Per-file progress resumes; case appears only after verification |
| Android Chrome | Pilot | Camera + PDF | Return through launcher | Same Pilot tab/scenario is restored; private evidence verifies |
| Installed Android PWA | Pilot | Gallery | Token refresh during upload | Session remains mounted; no Home redirect or duplicate case |
| iPhone Safari | Official | Camera | Return from camera | HEIC image is converted where supported; readable preview remains |
| iPhone Safari | Official | Photo Library | Suspend Safari | Draft and evidence restore from local storage |
| Installed iPhone web app | Pilot | Files PDF | App process interrupted | Pilot report remains queued locally until the student submits |
| Desktop Chrome/Edge | Official | Multiple files | Throttle network | Individual progress is visible and failed upload can be retried |
| Any supported device | Official non-emergency | Offline | Save report | Marked undelivered; student must reconnect and choose Send now |
| Any supported device | Official emergency | Offline | Attempt submit | Submission is blocked and explicitly states it was not delivered |
| Any supported device | Pilot emergency | Offline | Attempt submit | Simulation is blocked and never implies external dispatch |
| Staff portal | Official | Preview/download | Open then download | Preview and download create audit rows; download requires reason |
| Pilot staff portal | Pilot | Preview | Open evidence | Signed link is short-lived and campus/role scoped |
| Pilot super-admin | Analytics | Completed tests | Refresh dashboard | Evidence success, duration, device, network and recurring errors update |

## Evidence required for sign-off

- Device and OS version
- Browser/PWA version
- Screenshot of selected evidence state
- Screenshot of upload progress and completed receipt
- Case reference
- Confirmation that the attachment appears in the authorised staff portal
- Evidence access audit record
- Any error code, network type and exact reproduction steps

## Acceptance rule

A release is not approved merely because the student interface displays a selected file. The report, attachment metadata, private Storage object, formal receipt, authorised staff preview and evidence-access audit must all be verified end to end.
