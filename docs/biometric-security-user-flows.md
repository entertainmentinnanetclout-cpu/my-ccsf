# User flows

Student: email + password OR enrolled biometric -> Student Portal.

Admin/CPS: email + password OR enrolled biometric -> mandatory TOTP AAL2 -> privileged portal.

Developer: email + password OR enrolled biometric -> mandatory TOTP AAL2 -> developer device biometric assertion when policy is active -> Developer Control Plane. Sensitive mutations may additionally request a fresh TOTP code inline without ending the session.
