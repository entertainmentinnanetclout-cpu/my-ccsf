# Biometric security rollout checklist

- [x] Account WebAuthn schema deployed.
- [x] Developer WebAuthn step-up schema deployed.
- [x] Passwordless biometric Edge Function deployed with public pre-login challenge endpoints and authenticated settings actions.
- [x] Developer biometric Edge Function deployed behind AAL2.
- [x] Developer control API verifies biometric assertions when the owner policy is active.
- [x] Password remains an available first factor.
- [x] Student biometric login is optional and user-controlled.
- [x] Admin/CPS/Developer TOTP MFA remains mandatory after password or biometric first factor.
- [x] Developer fresh-MFA sensitive controls use an inline modal and resume the queued action without logout.
- [x] Developer People/Sessions search filters locally without per-key network reload.
- [x] Developer biometric enforcement activates only after successful owner enrollment.
- [ ] Merge only after GitHub QA and Vercel Preview are green.
- [ ] Verify production routes after merge.
