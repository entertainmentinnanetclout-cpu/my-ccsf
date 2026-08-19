import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "npm:@simplewebauthn/server@13.3.2";

const exactOrigins = new Set([
  "https://my-ccsf.vercel.app",
  "https://mycampussafetyapptut.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080",
]);

function originAllowed(origin: string) {
  if (exactOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && /^my-ccsf-[a-z0-9-]+\.vercel\.app$/i.test(url.hostname);
  } catch {
    return false;
  }
}

const json = (body: unknown, status = 200, origin?: string | null) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Access-Control-Allow-Origin": origin && originAllowed(origin) ? origin : "https://my-ccsf.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  },
});

const asString = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
const objectValue = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

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
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function rpContext(origin: string) {
  if (!originAllowed(origin)) throw new Error("origin_not_allowed");
  const url = new URL(origin);
  return { origin, rpID: url.hostname };
}

function restrictionStillActive(expiresAt: string | null) {
  return !expiresAt || new Date(expiresAt) > new Date();
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  if (req.method === "OPTIONS") {
    if (!originAllowed(origin)) return json({ error: "Origin not allowed", code: "origin_not_allowed" }, 403, origin);
    return json({}, 200, origin);
  }
  if (req.method !== "POST") return json({ error: "Method not allowed", code: "method_not_allowed" }, 405, origin);

  let rp: { origin: string; rpID: string };
  try {
    rp = rpContext(origin);
  } catch {
    return json({ error: "Biometric authentication is only available on an approved CCSF origin.", code: "origin_not_allowed" }, 403, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Biometric service configuration is incomplete.", code: "configuration_error" }, 500, origin);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

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

  await admin.rpc("cleanup_expired_account_biometric_challenges");

  const getAuthenticated = async () => {
    const header = req.headers.get("Authorization");
    if (!header?.startsWith("Bearer ")) return { user: null, token: null, claims: {} as Record<string, unknown> };
    const token = header.slice(7);
    const { data: { user }, error } = await admin.auth.getUser(token);
    return { user: error ? null : user, token, claims: decodeJwtPayload(token) };
  };

  const activeProfile = async (userId: string, expectedEmail?: string | null) => {
    const [{ data: profile }, { data: access }, { data: developer }, { data: roles }] = await Promise.all([
      admin.from("profiles").select("id,email").eq("id", userId).maybeSingle(),
      admin.from("user_access").select("status,expires_at").eq("user_id", userId).maybeSingle(),
      admin.from("developer_access").select("user_id").eq("user_id", userId).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if (!profile?.email) return null;
    const normalizedEmail = String(profile.email).toLowerCase();
    if (expectedEmail && normalizedEmail !== expectedEmail.toLowerCase()) return null;
    if (access?.status === "blocked" || access?.status === "suspended") return null;
    if (access?.expires_at && new Date(access.expires_at) <= new Date()) return null;

    const restrictionQueries = [
      admin.from("access_restrictions").select("id,expires_at").eq("active", true).eq("restriction_kind", "user").eq("target_user_id", userId),
      admin.from("access_restrictions").select("id,expires_at").eq("active", true).eq("restriction_kind", "email").eq("target_email", normalizedEmail),
    ];
    if (ip) restrictionQueries.push(admin.from("access_restrictions").select("id,expires_at").eq("active", true).eq("restriction_kind", "ip").eq("target_ip", ip));
    const restrictionResults = await Promise.all(restrictionQueries);
    if (restrictionResults.some((result) => (result.data ?? []).some((row) => restrictionStillActive(row.expires_at)))) return null;

    const roleNames = (roles ?? []).map((row) => String(row.role));
    const privileged = Boolean(developer) || roleNames.includes("admin") || roleNames.includes("security");
    return { id: profile.id, email: normalizedEmail, privileged, roles: roleNames };
  };

  const verifiedAuthUser = async (userId: string, expectedEmail: string) => {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    const user = data?.user;
    if (error || !user || !user.email || user.email.toLowerCase() !== expectedEmail.toLowerCase()) return null;
    if (!(user.email_confirmed_at || user.confirmed_at) || user.is_anonymous) return null;
    if (user.banned_until && new Date(user.banned_until) > new Date()) return null;
    return user;
  };

  const logEvent = async (userId: string | null, eventType: string, severity = "info", metadata: Record<string, unknown> = {}) => {
    await admin.from("runtime_events").insert({
      user_id: userId,
      ip_address: ip,
      edge_function: "biometric-auth",
      event_type: eventType,
      severity,
      metadata: { ...metadata, rp_id: rp.rpID, user_agent: userAgent },
    });
  };

  if (action === "status" || action === "registration_options" || action === "registration_verify" || action === "set_enabled" || action === "remove_credential") {
    const { user, claims } = await getAuthenticated();
    if (!user) return json({ error: "Authentication required.", code: "authentication_required" }, 401, origin);
    const profile = await activeProfile(user.id, user.email ?? null);
    if (!profile) return json({ error: "This profile is not active for biometric login.", code: "profile_inactive" }, 403, origin);
    if (profile.privileged && claims.aal !== "aal2") {
      return json({ error: "AAL2 MFA is required before changing biometric login for an Admin, CPS/Security, or Developer account.", code: "aal2_required" }, 403, origin);
    }

    if (action === "status") {
      const [{ data: preference }, { data: credentials, error }] = await Promise.all([
        admin.from("account_biometric_preferences").select("login_enabled,updated_at").eq("user_id", user.id).maybeSingle(),
        admin.from("account_biometric_credentials").select("id,device_type,backed_up,transports,rp_id,friendly_name,enabled,created_at,last_used_at").eq("user_id", user.id).eq("enabled", true).eq("rp_id", rp.rpID).order("created_at", { ascending: false }),
      ]);
      if (error) return json({ error: error.message, code: "credential_lookup_failed" }, 500, origin);
      return json({ login_enabled: preference?.login_enabled === true, credentials: credentials ?? [], credential_count: credentials?.length ?? 0, rp_id: rp.rpID, privileged: profile.privileged }, 200, origin);
    }

    if (action === "registration_options") {
      const { data: existing, error } = await admin.from("account_biometric_credentials").select("credential_id,transports").eq("user_id", user.id).eq("rp_id", rp.rpID).eq("enabled", true);
      if (error) return json({ error: error.message, code: "credential_lookup_failed" }, 500, origin);
      const options = await generateRegistrationOptions({
        rpName: "My CCSF",
        rpID: rp.rpID,
        userName: profile.email,
        userID: new TextEncoder().encode(user.id),
        attestationType: "none",
        excludeCredentials: (existing ?? []).map((row) => ({ id: row.credential_id, transports: row.transports ?? undefined })),
        authenticatorSelection: { residentKey: "preferred", userVerification: "required", authenticatorAttachment: "platform" },
        supportedAlgorithmIDs: [-7, -257],
      });
      const challengeId = crypto.randomUUID();
      const sessionId = typeof claims.session_id === "string" ? claims.session_id : null;
      const { error: challengeError } = await admin.from("account_biometric_challenges").insert({
        id: challengeId,
        user_id: user.id,
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
      const challengeId = asString(payload.challenge_id, 80);
      const response = payload.response;
      const friendlyName = asString(payload.friendly_name, 120) || "CCSF biometric device";
      const { data: challenge } = await admin.from("account_biometric_challenges").select("id,user_id,challenge,rp_id,origin,expires_at,consumed_at").eq("id", challengeId).eq("user_id", user.id).eq("ceremony", "registration").maybeSingle();
      if (!challenge || challenge.consumed_at || new Date(challenge.expires_at) <= new Date()) return json({ error: "Registration challenge is missing or expired.", code: "challenge_expired" }, 400, origin);
      try {
        const verification = await verifyRegistrationResponse({ response: response as never, expectedChallenge: challenge.challenge, expectedOrigin: challenge.origin, expectedRPID: challenge.rp_id, requireUserVerification: true });
        if (!verification.verified || !verification.registrationInfo) return json({ error: "Biometric registration could not be verified.", code: "verification_failed" }, 400, origin);
        const info = verification.registrationInfo;
        const credential = info.credential;
        const credentialRowId = crypto.randomUUID();
        const { error: storeError } = await admin.from("account_biometric_credentials").upsert({
          id: credentialRowId,
          user_id: user.id,
          credential_id: credential.id,
          public_key_base64url: bytesToBase64url(credential.publicKey),
          counter: credential.counter,
          device_type: info.credentialDeviceType,
          backed_up: info.credentialBackedUp,
          transports: credential.transports ?? [],
          rp_id: challenge.rp_id,
          friendly_name: friendlyName,
          enabled: true,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "credential_id" });
        if (storeError) return json({ error: storeError.message, code: "credential_store_failed" }, 500, origin);
        await Promise.all([
          admin.from("account_biometric_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", challenge.id),
          admin.from("account_biometric_preferences").upsert({ user_id: user.id, login_enabled: true, updated_at: new Date().toISOString() }, { onConflict: "user_id" }),
          logEvent(user.id, "biometric_credential_registered", "info", { device_type: info.credentialDeviceType, backed_up: info.credentialBackedUp }),
        ]);
        return json({ verified: true }, 200, origin);
      } catch (caught) {
        return json({ error: caught instanceof Error ? caught.message : "Biometric registration failed.", code: "verification_failed" }, 400, origin);
      }
    }

    if (action === "set_enabled") {
      const enabled = payload.enabled === true;
      if (enabled) {
        const { count } = await admin.from("account_biometric_credentials").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("rp_id", rp.rpID).eq("enabled", true);
        if (!count) return json({ error: "Register this device before enabling biometric login.", code: "credential_required" }, 400, origin);
      }
      const { error } = await admin.from("account_biometric_preferences").upsert({ user_id: user.id, login_enabled: enabled, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) return json({ error: error.message, code: "preference_update_failed" }, 500, origin);
      await logEvent(user.id, enabled ? "biometric_login_enabled" : "biometric_login_disabled");
      return json({ success: true, login_enabled: enabled }, 200, origin);
    }

    if (action === "remove_credential") {
      const credentialRowId = asString(payload.credential_id, 80);
      const { data: removed, error } = await admin.from("account_biometric_credentials").delete().eq("id", credentialRowId).eq("user_id", user.id).eq("rp_id", rp.rpID).select("id,friendly_name").maybeSingle();
      if (error) return json({ error: error.message, code: "credential_delete_failed" }, 500, origin);
      if (!removed) return json({ error: "Credential not found.", code: "credential_not_found" }, 404, origin);
      const { count } = await admin.from("account_biometric_credentials").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("rp_id", rp.rpID).eq("enabled", true);
      if (!count) await admin.from("account_biometric_preferences").upsert({ user_id: user.id, login_enabled: false, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      await logEvent(user.id, "biometric_credential_removed", "warning", { credential_id: credentialRowId, friendly_name: removed.friendly_name });
      return json({ success: true, login_enabled: Boolean(count) }, 200, origin);
    }
  }

  if (action === "authentication_options") {
    const email = asString(payload.email, 320).toLowerCase();
    if (!email) return json({ error: "Enter your CCSF account email before using biometric sign-in.", code: "email_required" }, 400, origin);
    const { data: profile } = await admin.from("profiles").select("id,email").eq("email", email).maybeSingle();
    const genericFailure = () => json({ error: "Biometric sign-in is not available for this account or device.", code: "biometric_unavailable" }, 400, origin);
    if (!profile?.id || !profile.email) return genericFailure();
    const active = await activeProfile(profile.id, email);
    if (!active) return genericFailure();
    const authUser = await verifiedAuthUser(profile.id, email);
    if (!authUser) return genericFailure();
    const [{ data: preference }, { data: credentials, error }] = await Promise.all([
      admin.from("account_biometric_preferences").select("login_enabled").eq("user_id", profile.id).maybeSingle(),
      admin.from("account_biometric_credentials").select("id,credential_id,transports").eq("user_id", profile.id).eq("rp_id", rp.rpID).eq("enabled", true),
    ]);
    if (error || preference?.login_enabled !== true || !credentials?.length) return genericFailure();
    const options = await generateAuthenticationOptions({
      rpID: rp.rpID,
      allowCredentials: credentials.map((row) => ({ id: row.credential_id, transports: row.transports ?? undefined })),
      userVerification: "required",
    });
    const challengeId = crypto.randomUUID();
    const { error: challengeError } = await admin.from("account_biometric_challenges").insert({
      id: challengeId,
      user_id: profile.id,
      session_id: null,
      ceremony: "authentication",
      challenge: options.challenge,
      rp_id: rp.rpID,
      origin: rp.origin,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    if (challengeError) return genericFailure();
    return json({ options, challenge_id: challengeId }, 200, origin);
  }

  if (action === "authentication_verify") {
    const challengeId = asString(payload.challenge_id, 80);
    const response = objectValue(payload.response);
    const credentialId = asString(response.id, 1500);
    const genericFailure = () => json({ error: "Biometric verification failed. Use your password or try again.", code: "biometric_verification_failed" }, 400, origin);
    const { data: challenge } = await admin.from("account_biometric_challenges").select("id,user_id,challenge,rp_id,origin,expires_at,consumed_at").eq("id", challengeId).eq("ceremony", "authentication").maybeSingle();
    if (!challenge || challenge.consumed_at || new Date(challenge.expires_at) <= new Date()) return genericFailure();
    const active = await activeProfile(challenge.user_id, null);
    if (!active) return genericFailure();
    const authUser = await verifiedAuthUser(challenge.user_id, active.email);
    if (!authUser) return genericFailure();
    const [{ data: preference }, { data: credential }] = await Promise.all([
      admin.from("account_biometric_preferences").select("login_enabled").eq("user_id", challenge.user_id).maybeSingle(),
      admin.from("account_biometric_credentials").select("id,credential_id,public_key_base64url,counter,transports,rp_id").eq("user_id", challenge.user_id).eq("credential_id", credentialId).eq("enabled", true).maybeSingle(),
    ]);
    if (preference?.login_enabled !== true || !credential || credential.rp_id !== challenge.rp_id) return genericFailure();
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
      if (!verification.verified) return genericFailure();
      await Promise.all([
        admin.from("account_biometric_credentials").update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", credential.id),
        admin.from("account_biometric_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", challenge.id),
      ]);
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: active.email });
      const tokenHash = linkData?.properties?.hashed_token;
      if (linkError || !tokenHash) {
        await logEvent(challenge.user_id, "biometric_login_token_failed", "error", { message: linkError?.message ?? "missing token hash" });
        return json({ error: "Biometric identity was verified but the CCSF session could not be created. Use your password and try again.", code: "session_token_failed" }, 500, origin);
      }
      await logEvent(challenge.user_id, "biometric_login_verified", "info", { credential_id: credential.id });
      return json({ verified: true, token_hash: tokenHash, token_type: "email" }, 200, origin);
    } catch (caught) {
      await logEvent(challenge.user_id, "biometric_login_failed", "warning", { message: caught instanceof Error ? caught.message : "verification failed" });
      return genericFailure();
    }
  }

  return json({ error: "Unsupported biometric action", code: "unsupported_action" }, 400, origin);
});
