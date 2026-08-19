import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function getClientIp(req: Request): string | null {
  const candidates = [
    req.headers.get("cf-connecting-ip"),
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    req.headers.get("x-real-ip"),
    req.headers.get("x-client-ip"),
  ];
  return candidates.find((value) => Boolean(value)) ?? null;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { payload = {}; }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  let user: { id: string; email?: string } | null = null;
  let authSessionId: string | null = null;

  if (token) {
    const { data: { user: verifiedUser } } = await admin.auth.getUser(token);
    if (verifiedUser) {
      user = { id: verifiedUser.id, email: verifiedUser.email ?? undefined };
      const claims = decodeJwtPayload(token);
      authSessionId = typeof claims.session_id === "string" ? claims.session_id : null;
    }
  }

  const rawDeviceId = typeof payload.device_id === "string" ? payload.device_id.slice(0, 200) : "";
  const deviceHash = rawDeviceId ? await sha256(rawDeviceId) : null;
  const ipAddress = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "";
  const ua = parseUserAgent(userAgent);
  const client = typeof payload.client === "object" && payload.client ? payload.client as Record<string, unknown> : {};

  const { data: systemRow } = await admin
    .from("runtime_controls")
    .select("config")
    .eq("key", "system")
    .maybeSingle();
  const system = (systemRow?.config ?? {}) as Record<string, unknown>;
  const mode = typeof system.mode === "string" ? system.mode : "live";
  const gateEnabled = system.access_gate_enabled === true;
  const approvalRequired = system.approval_required !== false;
  const telemetryEnabled = system.telemetry_enabled !== false;

  let isDeveloper = false;
  let accessStatus = user ? "pending" : "anonymous";
  let accessReason = "allowed";
  let allowed = mode === "live";

  if (user) {
    const [{ data: developer }, { data: userAccess }] = await Promise.all([
      admin.from("developer_access").select("user_id").eq("user_id", user.id).maybeSingle(),
      admin.from("user_access").select("status,reason,expires_at").eq("user_id", user.id).maybeSingle(),
    ]);
    isDeveloper = Boolean(developer);
    accessStatus = userAccess?.status ?? "pending";

    if (isDeveloper) {
      allowed = true;
      accessReason = "developer_bypass";
    } else if (mode !== "live") {
      allowed = false;
      accessReason = "system_paused";
    } else if (gateEnabled) {
      if (["blocked", "suspended"].includes(accessStatus)) {
        allowed = false;
        accessReason = accessStatus;
      } else if (approvalRequired && accessStatus !== "approved") {
        allowed = false;
        accessReason = "approval_required";
      } else if (userAccess?.expires_at && new Date(userAccess.expires_at).getTime() <= Date.now()) {
        allowed = false;
        accessReason = "access_expired";
      }
    }
  } else if (mode !== "live") {
    allowed = false;
    accessReason = "system_paused";
  }

  async function hasRestriction(kind: string, column: string, value: string | null | undefined) {
    if (!value) return false;
    const { data } = await admin
      .from("access_restrictions")
      .select("id")
      .eq("restriction_kind", kind)
      .eq(column, value)
      .eq("active", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .limit(1);
    return Boolean(data?.length);
  }

  if (!isDeveloper && allowed) {
    const restrictionChecks = await Promise.all([
      user ? hasRestriction("user", "target_user_id", user.id) : false,
      user?.email ? hasRestriction("email", "target_email", user.email.toLowerCase()) : false,
      hasRestriction("ip", "target_ip", ipAddress),
      hasRestriction("device", "target_device_hash", deviceHash),
      hasRestriction("session", "target_session_id", authSessionId),
    ]);
    if (restrictionChecks.some(Boolean)) {
      allowed = false;
      accessReason = "restricted";
    }

    if (authSessionId) {
      const { data: revoked } = await admin
        .from("revoked_auth_sessions")
        .select("session_id")
        .eq("session_id", authSessionId)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .maybeSingle();
      if (revoked) {
        allowed = false;
        accessReason = "session_revoked";
      }
    }
  }

  if (deviceHash) {
    let existingQuery = admin.from("device_registry").select("id").eq("device_hash", deviceHash);
    existingQuery = user ? existingQuery.eq("user_id", user.id) : existingQuery.is("user_id", null);
    const { data: existingRows } = await existingQuery.order("last_seen_at", { ascending: false }).limit(1);
    const deviceData = {
      auth_session_id: authSessionId,
      user_id: user?.id ?? null,
      device_hash: deviceHash,
      device_type: typeof client.device_type === "string" ? client.device_type : ua.deviceType,
      browser_name: typeof client.browser_name === "string" ? client.browser_name : ua.browserName,
      browser_version: typeof client.browser_version === "string" ? client.browser_version : ua.browserVersion,
      operating_system: typeof client.operating_system === "string" ? client.operating_system : ua.operatingSystem,
      ip_address: ipAddress,
      user_agent: userAgent.slice(0, 1000),
      locale: typeof client.locale === "string" ? client.locale.slice(0, 64) : null,
      timezone: typeof client.timezone === "string" ? client.timezone.slice(0, 100) : null,
      viewport_width: Number.isFinite(client.viewport_width) ? Number(client.viewport_width) : null,
      viewport_height: Number.isFinite(client.viewport_height) ? Number(client.viewport_height) : null,
      network_type: typeof client.network_type === "string" ? client.network_type.slice(0, 64) : null,
      last_seen_at: new Date().toISOString(),
    };
    if (existingRows?.[0]?.id) {
      await admin.from("device_registry").update(deviceData).eq("id", existingRows[0].id);
    } else {
      await admin.from("device_registry").insert(deviceData);
    }
  }

  if (telemetryEnabled && payload.event && typeof payload.event === "object") {
    const event = payload.event as Record<string, unknown>;
    const severity = ["info", "warning", "error", "critical"].includes(String(event.severity)) ? String(event.severity) : "info";
    await admin.from("runtime_events").insert({
      user_id: user?.id ?? null,
      auth_session_id: authSessionId,
      device_hash: deviceHash,
      event_type: typeof event.type === "string" ? event.type.slice(0, 80) : "client_event",
      severity,
      route: typeof event.route === "string" ? event.route.slice(0, 500) : null,
      message: typeof event.message === "string" ? event.message.slice(0, 2000) : null,
      stack: typeof event.stack === "string" ? event.stack.slice(0, 8000) : null,
      duration_ms: Number.isFinite(event.duration_ms) ? Math.round(Number(event.duration_ms)) : null,
      status_code: Number.isFinite(event.status_code) ? Math.round(Number(event.status_code)) : null,
      metadata: typeof event.metadata === "object" && event.metadata ? event.metadata : {},
    });
  }

  const { data: flags } = await admin.from("feature_flags").select("key,enabled,config");
  const effectiveFlags: Record<string, boolean> = {};
  for (const flag of flags ?? []) effectiveFlags[flag.key] = flag.enabled;

  if (user) {
    const { data: overrides } = await admin
      .from("feature_flag_overrides")
      .select("feature_key,enabled")
      .eq("user_id", user.id);
    for (const override of overrides ?? []) effectiveFlags[override.feature_key] = override.enabled;
  }

  return json({
    ok: true,
    access: { allowed, reason: accessReason, status: accessStatus, is_developer: isDeveloper },
    system: {
      mode,
      message: typeof system.message === "string" ? system.message : "",
      approval_required: approvalRequired,
      access_gate_enabled: gateEnabled,
    },
    features: effectiveFlags,
    session: { auth_session_id: authSessionId, device_hash: deviceHash },
  });
});
