import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

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

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function firstHeader(req: Request, names: string[]): string | null {
  for (const name of names) {
    const value = req.headers.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

function getClientIp(req: Request): string | null {
  return firstHeader(req, ["cf-connecting-ip", "x-forwarded-for", "x-real-ip", "x-client-ip"])?.split(",")[0]?.trim() ?? null;
}

function getGeo(req: Request) {
  return {
    country: firstHeader(req, ["cf-ipcountry", "x-vercel-ip-country"]),
    region: firstHeader(req, ["cf-region", "x-vercel-ip-country-region"]),
    city: firstHeader(req, ["cf-ipcity", "x-vercel-ip-city"]),
  };
}

function parseUserAgent(userAgent: string) {
  const ua = userAgent || "";
  let browserName = "Unknown";
  let browserVersion = "";
  const browserPatterns: Array<[string, RegExp]> = [
    ["Edge", /Edg\/([\d.]+)/],
    ["Chrome", /Chrome\/([\d.]+)/],
    ["Firefox", /Firefox\/([\d.]+)/],
    ["Safari", /Version\/([\d.]+).*Safari/],
  ];
  for (const [name, pattern] of browserPatterns) {
    const match = ua.match(pattern);
    if (match) { browserName = name; browserVersion = match[1] ?? ""; break; }
  }
  let operatingSystem = "Unknown";
  if (/Windows NT/i.test(ua)) operatingSystem = "Windows";
  else if (/Android/i.test(ua)) operatingSystem = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) operatingSystem = "iOS/iPadOS";
  else if (/Mac OS X/i.test(ua)) operatingSystem = "macOS";
  else if (/Linux/i.test(ua)) operatingSystem = "Linux";
  let deviceType = "Desktop";
  if (/iPad|Tablet/i.test(ua)) deviceType = "Tablet";
  else if (/Mobile|Android|iPhone|iPod/i.test(ua)) deviceType = "Mobile";
  return { browserName, browserVersion, operatingSystem, deviceType };
}

function strongestMode(modes: Array<string | null | undefined>): string {
  if (modes.includes("locked")) return "locked";
  if (modes.includes("maintenance")) return "maintenance";
  if (modes.includes("read_only")) return "read_only";
  return "live";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Runtime observer configuration is incomplete" }, 500);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { payload = {}; }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  let user: { id: string; email?: string } | null = null;
  let authSessionId: string | null = null;
  let aal = "aal1";
  if (token) {
    const { data: { user: verifiedUser } } = await admin.auth.getUser(token);
    if (verifiedUser) {
      user = { id: verifiedUser.id, email: verifiedUser.email ?? undefined };
      const claims = decodeJwtPayload(token);
      authSessionId = typeof claims.session_id === "string" ? claims.session_id : null;
      aal = typeof claims.aal === "string" ? claims.aal : "aal1";
    }
  }

  const rawDeviceId = typeof payload.device_id === "string" ? payload.device_id.slice(0, 200) : "";
  const deviceHash = rawDeviceId ? await sha256(rawDeviceId) : null;
  const ipAddress = getClientIp(req);
  const geo = getGeo(req);
  const userAgent = req.headers.get("user-agent") ?? "";
  const ua = parseUserAgent(userAgent);
  const client = payload.client && typeof payload.client === "object" && !Array.isArray(payload.client)
    ? payload.client as Record<string, unknown> : {};

  const { data: systemRow } = await admin.from("runtime_controls").select("config").eq("key", "system").maybeSingle();
  const system = (systemRow?.config ?? {}) as Record<string, unknown>;
  const globalMode = typeof system.mode === "string" ? system.mode : "live";
  const gateEnabled = system.access_gate_enabled === true;
  const approvalRequired = system.approval_required === true;
  const telemetryEnabled = system.telemetry_enabled !== false;
  const developerContact = typeof system.developer_contact === "string" ? system.developer_contact : "Dubea@tut.ac.za";

  let isDeveloper = false;
  let developerIsOwner = false;
  let accessStatus = user ? "approved" : "anonymous";
  let accessReason = "allowed";
  let campus: string | null = null;
  let campusMode = "live";
  let roles: string[] = [];
  let features: Record<string, boolean> = {};
  const moduleModes: Record<string, string> = {};

  if (user) {
    const now = new Date().toISOString();
    const [developerResult, accessResult, profileResult, rolesResult, featureResult, windowsResult] = await Promise.all([
      admin.from("developer_access").select("user_id,is_owner").eq("user_id", user.id).maybeSingle(),
      admin.from("user_access").select("status,reason,expires_at").eq("user_id", user.id).maybeSingle(),
      admin.from("profiles").select("campus").eq("id", user.id).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", user.id),
      admin.rpc("runtime_feature_map", { p_user_id: user.id }),
      admin.from("maintenance_windows").select("scope,campus,module_key,mode,message,starts_at,ends_at").eq("active", true).lte("starts_at", now).gt("ends_at", now),
    ]);
    isDeveloper = Boolean(developerResult.data);
    developerIsOwner = developerResult.data?.is_owner === true;
    accessStatus = accessResult.data?.status ?? "approved";
    campus = profileResult.data?.campus ?? null;
    roles = (rolesResult.data ?? []).map((row) => String(row.role));
    features = (featureResult.data && typeof featureResult.data === "object" ? featureResult.data : {}) as Record<string, boolean>;

    if (campus) {
      const { data: campusRow } = await admin.from("campus_runtime_controls").select("mode,message").eq("campus", campus).maybeSingle();
      campusMode = campusRow?.mode ?? "live";
    }

    const activeWindows = windowsResult.data ?? [];
    const applicableModes = activeWindows
      .filter((row) => row.scope === "global" || (row.scope === "campus" && campus && row.campus === campus))
      .map((row) => row.mode);
    for (const row of activeWindows) {
      if (row.scope === "module" && row.module_key) {
        moduleModes[row.module_key] = strongestMode([moduleModes[row.module_key], row.mode]);
        if (["maintenance", "locked"].includes(row.mode)) features[row.module_key] = false;
      }
    }

    const effectiveMode = strongestMode([globalMode, campusMode, ...applicableModes]);
    let allowed = true;

    // Developers may always reach the browser recovery/MFA surface. Database bypass
    // still requires AAL2 when the RLS gate is enabled.
    if (isDeveloper) {
      allowed = true;
      accessReason = aal === "aal2" ? "developer_bypass" : "developer_mfa_required";
    } else if (gateEnabled) {
      if (["maintenance", "locked"].includes(effectiveMode)) {
        allowed = false;
        accessReason = effectiveMode === "locked" ? "system_paused" : "maintenance";
      } else if (["blocked", "suspended"].includes(accessStatus)) {
        allowed = false;
        accessReason = accessStatus;
      } else if (approvalRequired && accessStatus !== "approved" && accessStatus !== "quarantined") {
        allowed = false;
        accessReason = "approval_required";
      } else if (accessResult.data?.expires_at && new Date(accessResult.data.expires_at).getTime() <= Date.now()) {
        allowed = false;
        accessReason = "access_expired";
      }

      if (allowed && roles.includes("admin") && features.admin_portal === false) {
        allowed = false;
        accessReason = "feature_disabled";
      }
      if (allowed && roles.includes("security") && features.cps_portal === false) {
        allowed = false;
        accessReason = "feature_disabled";
      }
    }

    async function hasRestriction(kind: string, column: string, value: string | null | undefined) {
      if (!value) return false;
      const { data } = await admin.from("access_restrictions").select("id")
        .eq("restriction_kind", kind).eq(column, value).eq("active", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).limit(1);
      return Boolean(data?.length);
    }

    if (!isDeveloper && allowed && gateEnabled) {
      const checks = await Promise.all([
        hasRestriction("user", "target_user_id", user.id),
        user.email ? hasRestriction("email", "target_email", user.email.toLowerCase()) : false,
        hasRestriction("ip", "target_ip", ipAddress),
        hasRestriction("device", "target_device_hash", deviceHash),
        hasRestriction("session", "target_session_id", authSessionId),
      ]);
      if (checks.some(Boolean)) { allowed = false; accessReason = "restricted"; }
      if (allowed && authSessionId) {
        const { data: revoked } = await admin.from("revoked_auth_sessions").select("session_id")
          .eq("session_id", authSessionId).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).maybeSingle();
        if (revoked) { allowed = false; accessReason = "session_revoked"; }
      }
    }

    if (deviceHash) {
      const { data: existingRows } = await admin.from("device_registry").select("id")
        .eq("device_hash", deviceHash).eq("user_id", user.id).order("last_seen_at", { ascending: false }).limit(1);
      const finiteNumber = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : null;
      const deviceData = {
        auth_session_id: authSessionId,
        user_id: user.id,
        device_hash: deviceHash,
        device_type: typeof client.device_type === "string" ? client.device_type : ua.deviceType,
        browser_name: typeof client.browser_name === "string" ? client.browser_name : ua.browserName,
        browser_version: typeof client.browser_version === "string" ? client.browser_version : ua.browserVersion,
        operating_system: typeof client.operating_system === "string" ? client.operating_system : ua.operatingSystem,
        ip_address: ipAddress,
        user_agent: userAgent.slice(0, 1000),
        locale: typeof client.locale === "string" ? client.locale.slice(0, 64) : null,
        timezone: typeof client.timezone === "string" ? client.timezone.slice(0, 100) : null,
        viewport_width: finiteNumber(client.viewport_width),
        viewport_height: finiteNumber(client.viewport_height),
        network_type: typeof client.network_type === "string" ? client.network_type.slice(0, 64) : null,
        country_code: geo.country,
        region: geo.region,
        city: geo.city,
        last_seen_at: new Date().toISOString(),
      };
      if (existingRows?.[0]?.id) await admin.from("device_registry").update(deviceData).eq("id", existingRows[0].id);
      else await admin.from("device_registry").insert(deviceData);
    }

    if (!allowed && telemetryEnabled) {
      await admin.from("runtime_events").insert({
        user_id: user.id, auth_session_id: authSessionId, device_hash: deviceHash,
        ip_address: ipAddress, event_type: "access_denied", severity: "warning",
        route: typeof client.route === "string" ? client.route.slice(0, 500) : null,
        message: accessReason, metadata: { campus, effective_mode: effectiveMode, access_status: accessStatus },
      });
    }

    if (telemetryEnabled && payload.event && typeof payload.event === "object" && !Array.isArray(payload.event)) {
      const event = payload.event as Record<string, unknown>;
      const severity = ["info", "warning", "error", "critical"].includes(String(event.severity)) ? String(event.severity) : "info";
      await admin.from("runtime_events").insert({
        user_id: user.id, auth_session_id: authSessionId, device_hash: deviceHash, ip_address: ipAddress,
        event_type: typeof event.type === "string" ? event.type.slice(0, 80) : "client_event",
        severity,
        route: typeof event.route === "string" ? event.route.slice(0, 500) : null,
        message: typeof event.message === "string" ? event.message.slice(0, 2000) : null,
        stack: typeof event.stack === "string" ? event.stack.slice(0, 8000) : null,
        duration_ms: Number.isFinite(Number(event.duration_ms)) ? Math.round(Number(event.duration_ms)) : null,
        status_code: Number.isFinite(Number(event.status_code)) ? Math.round(Number(event.status_code)) : null,
        metadata: event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) ? event.metadata : {},
      });
    }

    await admin.rpc("developer_detect_anomalies", {
      p_user_id: user.id, p_session_id: authSessionId, p_ip: ipAddress,
      p_device_hash: deviceHash, p_country: geo.country, p_region: geo.region,
    });

    return json({
      ok: true,
      access: { allowed, reason: accessReason, status: accessStatus, is_developer: isDeveloper, is_owner: developerIsOwner, aal },
      system: {
        mode: globalMode,
        effective_mode: effectiveMode,
        campus_mode: campusMode,
        campus,
        read_only: effectiveMode === "read_only" || accessStatus === "quarantined",
        message: typeof system.message === "string" ? system.message : "",
        approval_required: approvalRequired,
        access_gate_enabled: gateEnabled,
        developer_contact: developerContact,
        module_modes: moduleModes,
      },
      features,
      session: { auth_session_id: authSessionId, device_hash: deviceHash, country_code: geo.country, region: geo.region, city: geo.city },
    });
  }

  // Anonymous access checks remain stateless and never create telemetry/device records.
  const anonymousAllowed = globalMode === "live" || globalMode === "read_only";
  return json({
    ok: true,
    access: { allowed: anonymousAllowed, reason: anonymousAllowed ? "allowed" : "system_paused", status: "anonymous", is_developer: false, is_owner: false, aal: "aal1" },
    system: {
      mode: globalMode, effective_mode: globalMode, campus_mode: "live", campus: null,
      read_only: globalMode === "read_only", message: typeof system.message === "string" ? system.message : "",
      approval_required: approvalRequired, access_gate_enabled: gateEnabled, developer_contact: developerContact, module_modes: {},
    },
    features: {},
    session: { auth_session_id: null, device_hash: deviceHash, country_code: geo.country, region: geo.region, city: geo.city },
  });
});
