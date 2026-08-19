import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "npm:@simplewebauthn/server@13.3.2";

const allowedOrigins = new Set([
  "https://my-ccsf.vercel.app",
  "https://mycampussafetyapptut.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080",
]);

const json = (body: unknown, status = 200, origin?: string | null) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://my-ccsf.vercel.app",
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  },
});

const objectValue = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const asString = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const part = token.split(".")[1];
    if (!part) return {};
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

function clientIp(req: Request) {
  for (const header of ["cf-connecting-ip", "x-forwarded-for", "x-real-ip", "x-client-ip"]) {
    const value = req.headers.get(header)?.split(",")[0]?.trim();
    if (value) return value;
  }
  return null;
}

function bytesToBase64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64urlToBytes(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function rpContext(origin: string) {
  if (!allowedOrigins.has(origin)) throw new Error("origin_not_allowed");
  const url = new URL(origin);
  return { origin, rpID: url.hostname };
}

function hasFreshTotp(claims: Record<string, unknown>, maxAgeSeconds: number) {
  const amr = Array.isArray(claims.amr) ? claims.amr : [];
  const now = Math.floor(Date.now() / 1000);
  return amr.some((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const row = entry as Record<string, unknown>;
    return row.method === "totp" && typeof row.timestamp === "number" && now - row.timestamp <= maxAgeSeconds;
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  if (req.method === "OPTIONS") {
    if (!allowedOrigins.has(origin)) return json({ error: "Origin not allowed", code: "origin_not_allowed" }, 403, origin);
    return json({}, 200, origin);
  }
  if (req.method !== "POST") return json({ error: "Method not allowed", code: "method_not_allowed" }, 405, origin);

  let rp: { origin: string; rpID: string };
  try {
    rp = rpContext(origin);
  } catch {
    return json({ error: "Developer biometric verification is only available on an approved CCSF origin.", code: "origin_not_allowed" }, 403, origin);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized", code: "unauthorized" }, 401, origin);
  const token = authHeader.slice(7);
  const claims = decodeJwtPayload(token);
  const sessionId = typeof claims.session_id === "string" ? claims.session_id : null;
  const aal = typeof claims.aal === "string" ? claims.aal : "aal1";
  if (aal !== "aal2" || !sessionId) return json({ error: "AAL2 MFA is required before device biometric verification.", code: "aal2_required" }, 403, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Biometric service configuration is incomplete.", code: "configuration_error" }, 500, origin);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return json({ error: "Unauthorized", code: "unauthorized" }, 401, origin);

  const { data: developer, error: developerError } = await admin.from("developer_access").select("user_id,is_owner").eq("user_id", user.id).maybeSingle();
  if (developerError || !developer) return json({ error: "Developer access required", code: "developer_required" }, 403, origin);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body", code: "invalid_json" }, 400, origin);
  }
  const action = asString(body.action, 80);
  const payload = objectValue(body.payload);
  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent");

  const { data: systemRow } = await admin.from("runtime_controls").select("config").eq("key", "system").maybeSingle();
  const system = objectValue(systemRow?.config);
  const assertionMinutes = Math.max(1, Math.min(60, Number(system.developer_biometric_assertion_minutes) || 15));
  const totpMaxAge = Math.max(60, Math.min(900, Number(system.developer_biometric_registration_totp_max_age_seconds) || 300));
  const biometricRequired = system.developer_biometric_required === true;

  await admin.rpc("cleanup_expired_developer_biometric_state");

  const audit = async (event: string, targetId?: string, details: Record<string, unknown> = {}) => {
    await admin.from("developer_audit_logs").insert({
      developer_id: user.id,
      action: event,
      target_type: "biometric_credential",
      target_id: targetId ?? null,
      details: { ...details, rp_id: rp.rpID, ip_address: ip },
    });
  };

  const createAssertion = async (credentialRowId: string | null) => {
    const expiresAt = new Date(Date.now() + assertionMinutes * 60_000).toISOString();
    const { error } = await admin.from("developer_biometric_assertions").upsert({
      session_id: sessionId,
      developer_id: user.id,
      credential_id: credentialRowId,
      verified_at: new Date().toISOString(),
      expires_at: expiresAt,
      ip_address: ip,
      user_agent: userAgent,
      rp_id: rp.rpID,
    }, { onConflict: "session_id" });
    if (error) throw error;
    return expiresAt;
  };

  if (action === "status") {
    const [{ data: credentials, error: credentialError }, { data: assertion }] = await Promise.all([
      admin.from("developer_biometric_credentials")
        .select("id,credential_id,device_type,backed_up,transports,rp_id,friendly_name,enabled,created_at,last_used_at")
        .eq("developer_id", user.id)
        .eq("enabled", true)
        .order("created_at", { ascending: false }),
      admin.from("developer_biometric_assertions")
        .select("verified_at,expires_at,rp_id")
        .eq("developer_id", user.id)
        .eq("session_id", sessionId)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle(),
    ]);
    if (credentialError) return json({ error: credentialError.message, code: "credential_lookup_failed" }, 500, origin);
    const scoped = (credentials ?? []).filter((row) => row.rp_id === rp.rpID);
    return json({
      biometric_required: biometricRequired,
      rp_id: rp.rpID,
      credential_count: scoped.length,
      credentials: scoped,
      assertion_active: Boolean(assertion && assertion.rp_id === rp.rpID),
      assertion_expires_at: assertion?.expires_at ?? null,
      assertion_minutes: assertionMinutes,
    }, 200, origin);
  }

  if (action === "registration_options") {
    if (!hasFreshTotp(claims, totpMaxAge)) {
      return json({ error: "Re-enter a fresh authenticator code before enrolling a new biometric device.", code: "fresh_totp_required" }, 403, origin);
    }
    const { data: existing, error } = await admin.from("developer_biometric_credentials")
      .select("credential_id,transports")
      .eq("developer_id", user.id)
      .eq("rp_id", rp.rpID)
      .eq("enabled", true);
    if (error) return json({ error: error.message, code: "credential_lookup_failed" }, 500, origin);
    const options = await generateRegistrationOptions({
      rpName: "CCSF Developer Control Plane",
      rpID: rp.rpID,
      userName: user.email ?? user.id,
      userID: new TextEncoder().encode(user.id),
      attestationType: "none",
      excludeCredentials: (existing ?? []).map((row) => ({ id: row.credential_id, transports: row.transports ?? undefined })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
        authenticatorAttachment: "platform",
      },
      supportedAlgorithmIDs: [-7, -257],
    });
    const challengeId = crypto.randomUUID();
    const { error: challengeError } = await admin.from("developer_biometric_challenges").insert({
      id: challengeId,
      developer_id: user.id,
      session_id: sessionId,
      ceremony: "registration",
      challenge: options.challenge,
      rp_id: rp.rpID,
      origin: rp.origin,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    if (challengeError) return json({ error: challengeError.message, code: "challenge_store_failed" }, 500, origin);
    return json({ options, challenge_id: challengeId }, 200, origin);
  }

  if (action === "registration_verify") {
    if (!hasFreshTotp(claims, totpMaxAge)) {
      return json({ error: "Fresh authenticator verification expired. Re-enter your TOTP code and try again.", code: "fresh_totp_required" }, 403, origin);
    }
    const challengeId = asString(payload.challenge_id, 80);
    const response = payload.response;
    const friendlyName = asString(payload.friendly_name, 120) || "Developer biometric device";
    const { data: challenge, error: challengeError } = await admin.from("developer_biometric_challenges")
      .select("id,challenge,rp_id,origin,expires_at,consumed_at")
      .eq("id", challengeId)
      .eq("developer_id", user.id)
      .eq("session_id", sessionId)
      .eq("ceremony", "registration")
      .maybeSingle();
    if (challengeError || !challenge || challenge.consumed_at || new Date(challenge.expires_at) <= new Date()) {
      return json({ error: "Registration challenge is missing or expired.", code: "challenge_expired" }, 400, origin);
    }
    try {
      const verification = await verifyRegistrationResponse({
        response: response as never,
        expectedChallenge: challenge.challenge,
        expectedOrigin: challenge.origin,
        expectedRPID: challenge.rp_id,
        requireUserVerification: true,
      });
      if (!verification.verified || !verification.registrationInfo) {
        return json({ error: "Biometric registration could not be verified.", code: "verification_failed" }, 400, origin);
      }
      const info = verification.registrationInfo;
      const credential = info.credential;
      const credentialRowId = crypto.randomUUID();
      const { data: stored, error: storeError } = await admin.from("developer_biometric_credentials").upsert({
        id: credentialRowId,
        developer_id: user.id,
        credential_id: credential.id,
        public_key_base64url: bytesToBase64url(credential.publicKey),
        webauthn_user_id: bytesToBase64url(new TextEncoder().encode(user.id)),
        counter: credential.counter,
        device_type: info.credentialDeviceType,
        backed_up: info.credentialBackedUp,
        transports: credential.transports ?? [],
        rp_id: challenge.rp_id,
        friendly_name: friendlyName,
        enabled: true,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "credential_id" }).select("id").single();
      if (storeError) return json({ error: storeError.message, code: "credential_store_failed" }, 500, origin);
      await admin.from("developer_biometric_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", challenge.id);
      const expiresAt = await createAssertion(stored?.id ?? credentialRowId);
      await audit("developer_biometric_registered", stored?.id ?? credentialRowId, { friendly_name: friendlyName, device_type: info.credentialDeviceType, backed_up: info.credentialBackedUp });
      return json({ verified: true, assertion_expires_at: expiresAt }, 200, origin);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Biometric registration verification failed.";
      return json({ error: message, code: "verification_failed" }, 400, origin);
    }
  }

  if (action === "authentication_options") {
    const { data: credentials, error } = await admin.from("developer_biometric_credentials")
      .select("id,credential_id,transports")
      .eq("developer_id", user.id)
      .eq("rp_id", rp.rpID)
      .eq("enabled", true);
    if (error) return json({ error: error.message, code: "credential_lookup_failed" }, 500, origin);
    if (!credentials?.length) return json({ error: "No biometric credential is registered for this CCSF origin.", code: "no_credentials" }, 404, origin);
    const options = await generateAuthenticationOptions({
      rpID: rp.rpID,
      allowCredentials: credentials.map((row) => ({ id: row.credential_id, transports: row.transports ?? undefined })),
      userVerification: "required",
    });
    const challengeId = crypto.randomUUID();
    const { error: challengeError } = await admin.from("developer_biometric_challenges").insert({
      id: challengeId,
      developer_id: user.id,
      session_id: sessionId,
      ceremony: "authentication",
      challenge: options.challenge,
      rp_id: rp.rpID,
      origin: rp.origin,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    if (challengeError) return json({ error: challengeError.message, code: "challenge_store_failed" }, 500, origin);
    return json({ options, challenge_id: challengeId }, 200, origin);
  }

  if (action === "authentication_verify") {
    const challengeId = asString(payload.challenge_id, 80);
    const response = objectValue(payload.response);
    const credentialId = asString(response.id, 1500);
    const [{ data: challenge }, { data: credential, error: credentialError }] = await Promise.all([
      admin.from("developer_biometric_challenges")
        .select("id,challenge,rp_id,origin,expires_at,consumed_at")
        .eq("id", challengeId)
        .eq("developer_id", user.id)
        .eq("session_id", sessionId)
        .eq("ceremony", "authentication")
        .maybeSingle(),
      admin.from("developer_biometric_credentials")
        .select("id,credential_id,public_key_base64url,counter,transports,rp_id")
        .eq("developer_id", user.id)
        .eq("credential_id", credentialId)
        .eq("enabled", true)
        .maybeSingle(),
    ]);
    if (!challenge || challenge.consumed_at || new Date(challenge.expires_at) <= new Date()) return json({ error: "Authentication challenge is missing or expired.", code: "challenge_expired" }, 400, origin);
    if (credentialError || !credential || credential.rp_id !== challenge.rp_id) return json({ error: "Biometric credential was not found.", code: "credential_not_found" }, 404, origin);
    try {
      const verification = await verifyAuthenticationResponse({
        response: response as never,
        expectedChallenge: challenge.challenge,
        expectedOrigin: challenge.origin,
        expectedRPID: challenge.rp_id,
        credential: {
          id: credential.credential_id,
          publicKey: base64urlToBytes(credential.public_key_base64url),
          counter: Number(credential.counter) || 0,
          transports: credential.transports ?? undefined,
        },
        requireUserVerification: true,
      });
      if (!verification.verified) return json({ error: "Device biometric verification failed.", code: "verification_failed" }, 400, origin);
      const { error: updateError } = await admin.from("developer_biometric_credentials").update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", credential.id);
      if (updateError) return json({ error: updateError.message, code: "credential_update_failed" }, 500, origin);
      await admin.from("developer_biometric_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", challenge.id);
      const expiresAt = await createAssertion(credential.id);
      await audit("developer_biometric_verified", credential.id, { assertion_expires_at: expiresAt });
      return json({ verified: true, assertion_expires_at: expiresAt }, 200, origin);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Device biometric verification failed.";
      return json({ error: message, code: "verification_failed" }, 400, origin);
    }
  }

  if (action === "remove_credential") {
    const credentialRowId = asString(payload.credential_id, 80);
    const { data: assertion } = await admin.from("developer_biometric_assertions")
      .select("session_id")
      .eq("developer_id", user.id)
      .eq("session_id", sessionId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!assertion) return json({ error: "Verify Face ID, fingerprint, or your device authenticator before removing a biometric credential.", code: "biometric_required" }, 403, origin);
    const { data: removed, error } = await admin.from("developer_biometric_credentials")
      .delete()
      .eq("id", credentialRowId)
      .eq("developer_id", user.id)
      .select("id,friendly_name")
      .maybeSingle();
    if (error) return json({ error: error.message, code: "credential_delete_failed" }, 500, origin);
    if (!removed) return json({ error: "Credential not found.", code: "credential_not_found" }, 404, origin);
    await audit("developer_biometric_removed", credentialRowId, { friendly_name: removed.friendly_name });
    return json({ success: true }, 200, origin);
  }

  return json({ error: "Unsupported biometric action", code: "unsupported_action" }, 400, origin);
});
