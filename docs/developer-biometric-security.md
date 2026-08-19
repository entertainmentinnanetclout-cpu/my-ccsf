# CCSF biometric authentication policy

## First factor

Active CCSF accounts may sign in with either their password or an enrolled WebAuthn platform authenticator. Supported devices can present Face ID, Touch ID, fingerprint, Android face/device unlock, Windows Hello, or equivalent local user verification. CCSF stores the public WebAuthn credential and verification metadata only; biometric templates remain on the device.

## Privileged roles

Admin, CPS/Security and Developer accounts must complete TOTP multi-factor authentication to reach AAL2 after either password or biometric first-factor sign-in. Biometric sign-in never disables or substitutes privileged MFA.

The Developer Control Plane additionally supports a device-biometric step-up assertion. The Developer Owner biometric requirement is activated only after a valid owner credential has first been enrolled, preventing pre-enrollment lockout.

## Sensitive Developer controls

Sensitive actions use a fresh TOTP re-authentication window. If an action such as suspend, quarantine, block, session revocation, kill-switch change, cohort change or audit export requires fresh MFA, the portal queues the exact action and opens an inline authenticator-code dialog. Successful verification resumes the queued action without signing the Developer out.

## Search behavior

Developer People and Sessions search is local filtering over the already loaded inventory. Typing in the search box does not reload the Developer dashboard or re-fetch on each keystroke.
