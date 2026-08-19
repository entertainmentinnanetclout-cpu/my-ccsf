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

function asString(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseUserAgent(userAgent: string | null) {
  const ua = userAgent ?? "";
  let browser = "Unknown";
  let version = "";
  const patterns: Array<[string, RegExp]> = [
    ["Edge", /Edg\/([\d.]+)/],
    ["Chrome", /Chrome\/([\d.]+)/],
    ["Firefox", /Firefox\/([\d.]+)/],
    ["Safari", /Version\/([\d.]+).*Safari/],
  ];
  for (const [name, pattern] of patterns) {
    const match = ua.match(pattern);
    if (match) { browser = name; version = match[1] ?? ""; break; }
  }
  let os = "Unknown";
  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS/iPadOS";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  let device = "Desktop";
  if (/iPad|Tablet/i.test(ua)) device = "Tablet";
  else if (/Mobile|Android|iPhone|iPod/i.test(ua)) device = "Mobile";
  return { browser, version, os, device };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const { data: developer, error: developerError } = await admin
    .from("developer_access")
    .select("user_id,is_owner,permissions")
    .eq("user_id", user.id)
    .maybeSingle();
  if (developerError || !developer) return json({ error: "Developer access required" }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const action = asString(body.action, 80);
  const payload = typeof body.payload === "object" && body.payload ? body.payload as Record<string, unknown> : {};

  const audit = async (auditAction: string, targetType?: string, targetId?: string, details: Record<string, unknown> = {}) => {
    await admin.from("developer_audit_logs").insert({
      developer_id: user.id,
      action: auditAction,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      details,
    });
  };

  if (action === "summary") {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [users, sessions, events, controls, restrictions] = await Promise.all([
      caller.rpc("developer_user_overview"),
      caller.rpc("developer_session_overview"),
      admin.from("runtime_events").select("severity,event_type,created_at").gte("created_at", since),
      admin.from("runtime_controls").select("key,config").eq("key", "system").maybeSingle(),
      admin.from("access_restrictions").select("id", { count: "exact", head: true }).eq("active", true),
    ]);
    if (users.error || sessions.error) return json({ error: users.error?.message ?? sessions.error?.message }, 500);
    const userRows = users.data ?? [];
    const sessionRows = sessions.data ?? [];
    const eventRows = events.data ?? [];
    const byStatus: Record<string, number> = {};
    for (const row of userRows) byStatus[row.access_status] = (byStatus[row.access_status] ?? 0) + 1;
    const bySeverity: Record<string, number> = {};
    for (const row of eventRows) bySeverity[row.severity] = (bySeverity[row.severity] ?? 0) + 1;
    return json({
      users: { total: userRows.length, by_status: byStatus },
      sessions: { total: sessionRows.length, revoked: sessionRows.filter((row: Record<string, unknown>) => row.revoked).length },
      health_24h: { total_events: eventRows.length, by_severity: bySeverity },
      restrictions: { active: restrictions.count ?? 0 },
      system: controls.data?.config ?? {},
      developer: { user_id: user.id, is_owner: developer.is_owner, permissions: developer.permissions },
    });
  }

  if (action === "list_users") {
    const { data, error } = await caller.rpc("developer_user_overview");
    if (error) return json({ error: error.message }, 500);
    const query = asString(payload.query, 120).toLowerCase();
    let rows = data ?? [];
    if (query) {
      rows = rows.filter((row: Record<string, unknown>) => [row.email, row.full_name, row.first_name, row.last_name, row.campus]
        .some((value) => typeof value === "string" && value.toLowerCase().includes(query)));
    }
    return json({ users: rows.slice(0, 500) });
  }

  if (action === "list_sessions") {
    const { data, error } = await caller.rpc("developer_session_overview");
    if (error) return json({ error: error.message }, 500);
    const rows = (data ?? []).map((row: Record<string, unknown>) => {
      const parsed = parseUserAgent(typeof row.user_agent === "string" ? row.user_agent : null);
      return {
        ...row,
        device_type: row.device_type || parsed.device,
        browser_name: row.browser_name || parsed.browser,
        browser_version: row.browser_version || parsed.version,
        operating_system: row.operating_system || parsed.os,
      };
    });
    const query = asString(payload.query, 120).toLowerCase();
    const filtered = query ? rows.filter((row: Record<string, unknown>) => [row.email,row.full_name,row.ip_address,row.browser_name,row.operating_system,row.device_type]
      .some((value) => typeof value === "string" && value.toLowerCase().includes(query))) : rows;
    return json({ sessions: filtered.slice(0, 500) });
  }

  if (action === "list_restrictions") {
    const { data, error } = await admin.from("access_restrictions").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) return json({ error: error.message }, 500);
    return json({ restrictions: data ?? [] });
  }

  if (action === "list_features") {
    const [flags, overrides] = await Promise.all([
      admin.from("feature_flags").select("*").order("key"),
      admin.from("feature_flag_overrides").select("feature_key,user_id,enabled,reason,updated_at").order("updated_at", { ascending: false }).limit(500),
    ]);
    if (flags.error || overrides.error) return json({ error: flags.error?.message ?? overrides.error?.message }, 500);
    return json({ flags: flags.data ?? [], overrides: overrides.data ?? [] });
  }

  if (action === "list_health") {
    const hours = Math.max(1, Math.min(168, Number(payload.hours) || 24));
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await admin
      .from("runtime_events")
      .select("id,user_id,auth_session_id,device_hash,event_type,severity,route,message,duration_ms,status_code,metadata,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return json({ error: error.message }, 500);
    const rows = data ?? [];
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let durationTotal = 0;
    let durationCount = 0;
    for (const row of rows) {
      bySeverity[row.severity] = (bySeverity[row.severity] ?? 0) + 1;
      byType[row.event_type] = (byType[row.event_type] ?? 0) + 1;
      if (typeof row.duration_ms === "number") { durationTotal += row.duration_ms; durationCount += 1; }
    }
    return json({
      hours,
      summary: {
        total: rows.length,
        by_severity: bySeverity,
        by_type: byType,
        average_duration_ms: durationCount ? Math.round(durationTotal / durationCount) : null,
      },
      events: rows,
    });
  }

  if (action === "list_audit") {
    const { data, error } = await admin.from("developer_audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) return json({ error: error.message }, 500);
    return json({ audit: data ?? [] });
  }

  if (action === "set_system") {
    const { data: current, error: currentError } = await admin.from("runtime_controls").select("config").eq("key", "system").single();
    if (currentError) return json({ error: currentError.message }, 500);
    const patch = typeof payload.config === "object" && payload.config ? payload.config as Record<string, unknown> : {};
    const next = { ...(current.config ?? {}), ...patch };
    if (next.mode && !["live", "maintenance", "locked"].includes(String(next.mode))) return json({ error: "Invalid system mode" }, 400);
    const { error } = await admin.from("runtime_controls").update({ config: next, updated_by: user.id, updated_at: new Date().toISOString() }).eq("key", "system");
    if (error) return json({ error: error.message }, 500);
    await audit("set_system", "system", "system", { patch });
    return json({ success: true, config: next });
  }

  if (action === "set_user_access") {
    const userId = asString(payload.user_id, 64);
    const status = asString(payload.status, 32);
    const reason = asString(payload.reason, 1000);
    if (!userId || !["pending", "approved", "suspended", "blocked"].includes(status)) return json({ error: "Invalid user access request" }, 400);
    const values: Record<string, unknown> = { status, reason: reason || null, updated_at: new Date().toISOString() };
    if (status === "approved") { values.approved_by = user.id; values.approved_at = new Date().toISOString(); }
    const { error } = await admin.from("user_access").upsert({ user_id: userId, ...values }, { onConflict: "user_id" });
    if (error) return json({ error: error.message }, 500);
    let revoked = 0;
    if (["blocked", "suspended"].includes(status)) {
      const result = await caller.rpc("developer_revoke_user_sessions", { target_user_id: userId, revoke_reason: reason || `Access ${status}` });
      revoked = result.data ?? 0;
    }
    await audit("set_user_access", "user", userId, { status, reason, revoked_sessions: revoked });
    return json({ success: true, revoked_sessions: revoked });
  }

  if (action === "block") {
    const kind = asString(payload.kind, 20);
    const value = asString(payload.value, 500);
    const reason = asString(payload.reason, 1000) || "Developer restriction";
    if (!["user", "email", "ip", "device", "session"].includes(kind) || !value) return json({ error: "Invalid restriction" }, 400);
    const record: Record<string, unknown> = { restriction_kind: kind, reason, created_by: user.id, active: true };
    if (kind === "user") record.target_user_id = value;
    if (kind === "email") record.target_email = value.toLowerCase();
    if (kind === "ip") record.target_ip = value;
    if (kind === "device") record.target_device_hash = value;
    if (kind === "session") record.target_session_id = value;
    const { data, error } = await admin.from("access_restrictions").insert(record).select("*").single();
    if (error) return json({ error: error.message }, 500);
    if (kind === "user") {
      await admin.from("user_access").upsert({ user_id: value, status: "blocked", reason, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      await caller.rpc("developer_revoke_user_sessions", { target_user_id: value, revoke_reason: reason });
    }
    if (kind === "session") await caller.rpc("developer_revoke_session", { target_session_id: value, revoke_reason: reason });
    await audit("block", kind, value, { restriction_id: data.id, reason });
    return json({ success: true, restriction: data });
  }

  if (action === "unblock") {
    const restrictionId = asString(payload.restriction_id, 64);
    if (!restrictionId) return json({ error: "Restriction ID required" }, 400);
    const { data: existing, error: readError } = await admin.from("access_restrictions").select("*").eq("id", restrictionId).maybeSingle();
    if (readError || !existing) return json({ error: readError?.message ?? "Restriction not found" }, 404);
    const { error } = await admin.from("access_restrictions").update({ active: false, updated_at: new Date().toISOString() }).eq("id", restrictionId);
    if (error) return json({ error: error.message }, 500);
    if (existing.restriction_kind === "user" && existing.target_user_id) {
      await admin.from("user_access").update({ status: "approved", reason: null, approved_by: user.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", existing.target_user_id);
    }
    await audit("unblock", existing.restriction_kind, restrictionId, { target: existing });
    return json({ success: true });
  }

  if (action === "revoke_session") {
    const sessionId = asString(payload.session_id, 64);
    const reason = asString(payload.reason, 1000) || "Revoked by developer";
    if (!sessionId) return json({ error: "Session ID required" }, 400);
    const { data, error } = await caller.rpc("developer_revoke_session", { target_session_id: sessionId, revoke_reason: reason });
    if (error) return json({ error: error.message }, 500);
    return json({ success: Boolean(data) });
  }

  if (action === "revoke_user_sessions") {
    const userId = asString(payload.user_id, 64);
    const reason = asString(payload.reason, 1000) || "Revoked by developer";
    if (!userId) return json({ error: "User ID required" }, 400);
    const { data, error } = await caller.rpc("developer_revoke_user_sessions", { target_user_id: userId, revoke_reason: reason });
    if (error) return json({ error: error.message }, 500);
    return json({ success: true, revoked_sessions: data ?? 0 });
  }

  if (action === "toggle_feature") {
    const key = asString(payload.key, 120);
    const enabled = payload.enabled;
    if (!key || typeof enabled !== "boolean") return json({ error: "Feature key and enabled state are required" }, 400);
    const { error } = await admin.from("feature_flags").update({ enabled, updated_by: user.id, updated_at: new Date().toISOString() }).eq("key", key);
    if (error) return json({ error: error.message }, 500);
    await audit("toggle_feature", "feature", key, { enabled });
    return json({ success: true });
  }

  if (action === "set_feature_override") {
    const key = asString(payload.key, 120);
    const userId = asString(payload.user_id, 64);
    const enabled = payload.enabled;
    const reason = asString(payload.reason, 1000);
    if (!key || !userId || typeof enabled !== "boolean") return json({ error: "Feature, user and enabled state are required" }, 400);
    const { error } = await admin.from("feature_flag_overrides").upsert({ feature_key: key, user_id: userId, enabled, reason: reason || null, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "feature_key,user_id" });
    if (error) return json({ error: error.message }, 500);
    await audit("set_feature_override", "user_feature", `${userId}:${key}`, { enabled, reason });
    return json({ success: true });
  }

  if (action === "remove_feature_override") {
    const key = asString(payload.key, 120);
    const userId = asString(payload.user_id, 64);
    if (!key || !userId) return json({ error: "Feature and user are required" }, 400);
    const { error } = await admin.from("feature_flag_overrides").delete().eq("feature_key", key).eq("user_id", userId);
    if (error) return json({ error: error.message }, 500);
    await audit("remove_feature_override", "user_feature", `${userId}:${key}`);
    return json({ success: true });
  }

  return json({ error: "Unknown action" }, 400);
});
