# Biometric security threat boundaries

CCSF uses WebAuthn user verification rather than collecting facial images or fingerprint templates. The authenticator performs user verification locally and signs a server challenge using a credential scoped to an approved CCSF origin.

Passwordless biometric login is permitted only for an active account with an enabled credential. Blocked/suspended accounts and active user/email/IP restrictions are rejected before authentication options are issued. Successful WebAuthn proof is exchanged for a normal Supabase Auth session.

Admin, CPS/Security and Developer sessions remain AAL1 after the biometric first factor and must complete mandatory TOTP MFA before protected privileged routes render.

The Developer Control Plane can additionally require a recent WebAuthn assertion tied to the developer session/IP. Sensitive mutations independently require a fresh TOTP re-authentication window, preventing a biometric assertion alone from authorising catastrophic controls.
