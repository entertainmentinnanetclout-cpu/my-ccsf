import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const asString = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
const objectValue = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const part = token.split(".")[1];
    if (!part) return {};
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch { return {}; }
}
function clientIp(req: Request) {
  for (const header of ["cf-connecting-ip", "x-forwarded-for", "x-real-ip", "x-client-ip"]) {
    const value = req.headers.get(header)?.split(",")[0]?.trim();
    if (value) return value;
  }
  return null;
}
function parseUserAgent(userAgent: string | null) {
  const ua = userAgent ?? "";
  let browser = "Unknown", version = "";
  for (const [name, pattern] of [["Edge", /Edg\/([\d.]+)/], ["Chrome", /Chrome\/([\d.]+)/], ["Firefox", /Firefox\/([\d.]+)/], ["Safari", /Version\/([\d.]+).*Safari/]] as Array<[string, RegExp]>) {
    const match = ua.match(pattern); if (match) { browser = name; version = match[1] ?? ""; break; }
  }
  let os = "Unknown"; if (/Windows NT/i.test(ua)) os = "Windows"; else if (/Android/i.test(ua)) os = "Android"; else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS/iPadOS"; else if (/Mac OS X/i.test(ua)) os = "macOS"; else if (/Linux/i.test(ua)) os = "Linux";
  let device = "Desktop"; if (/iPad|Tablet/i.test(ua)) device = "Tablet"; else if (/Mobile|Android|iPhone|iPod/i.test(ua)) device = "Mobile";
  return { browser, version, os, device };
}
function csvCell(value: unknown) {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
}

Deno.serve(async (req) => {
  const started = Date.now();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized", code: "unauthorized" }, 401);
  const token = authHeader.slice(7);
  const supabaseUrl = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Developer service configuration is incomplete", code: "configuration_error" }, 500);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return json({ error: "Unauthorized", code: "unauthorized" }, 401);
  const claims = decodeJwtPayload(token);
  const aal = typeof claims.aal === "string" ? claims.aal : "aal1";
  const sessionId = typeof claims.session_id === "string" ? claims.session_id : null;
  const ip = clientIp(req);

  const { data: developer, error: developerError } = await admin.from("developer_access").select("user_id,is_owner,permissions").eq("user_id", user.id).maybeSingle();
  if (developerError || !developer) return json({ error: "Developer access required", code: "developer_required" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body", code: "invalid_json" }, 400); }
  const action = asString(body.action, 80);
  const payload = objectValue(body.payload);

  if (aal !== "aal2") return json({ error: "Multi-factor verification is required for the Developer Control Plane.", code: "aal2_required" });

  const { data: systemRow } = await admin.from("runtime_controls").select("config").eq("key", "system").maybeSingle();
  const system = objectValue(systemRow?.config);
  const ipGateEnabled = system.developer_ip_allowlist_enabled === true;
  let ipAllowed = true;
  if (ipGateEnabled) {
    const result = await admin.rpc("developer_ip_allowed", { p_user_id: user.id, p_ip: ip });
    ipAllowed = result.data === true;
  }

  const recoveryActions = new Set(["mark_reauthenticated", "disable_ip_allowlist_recovery", "current_ip"]);
  if (!ipAllowed && !recoveryActions.has(action)) {
    return json({ error: "This network is not on the Developer IP allowlist.", code: "developer_ip_not_allowed", current_ip: ip });
  }

  const audit = async (auditAction: string, targetType?: string, targetId?: string, details: Record<string, unknown> = {}) => {
    await admin.from("developer_audit_logs").insert({ developer_id: user.id, action: auditAction, target_type: targetType ?? null, target_id: targetId ?? null, details });
  };
  const logInvocation = async () => {
    await admin.from("runtime_events").insert({ user_id: user.id, auth_session_id: sessionId, ip_address: ip, edge_function: "developer-control", event_type: "edge_invocation", severity: "info", duration_ms: Date.now() - started, metadata: { action } });
  };
  const done = async (bodyValue: unknown, status = 200) => { await logInvocation(); return json(bodyValue, status); };

  const freshRequired = new Set([
    "set_system","set_campus_mode","create_maintenance","cancel_maintenance","set_user_access","block","unblock","revoke_session","revoke_user_sessions",
    "toggle_feature","set_feature_override","remove_feature_override","create_feature_rule","delete_feature_rule","add_ip_allow","remove_ip_allow","set_ip_allowlist",
    "set_alert_rule","ack_alert","ack_anomaly","create_release_marker","export_audit"
  ]);
  const hasFreshReauth = async () => {
    if (!sessionId) return false;
    const { data } = await admin.from("developer_reauth_sessions").select("session_id").eq("session_id", sessionId).eq("developer_id", user.id).gt("expires_at", new Date().toISOString()).maybeSingle();
    return Boolean(data);
  };

  if (action === "current_ip") return done({ current_ip: ip, ip_allowed: ipAllowed, ip_allowlist_enabled: ipGateEnabled });

  if (action === "mark_reauthenticated") {
    if (!sessionId) return done({ error: "No authenticated session ID is available.", code: "session_required" });
    const windowMinutes = Math.max(1, Math.min(60, Number(system.reauth_window_minutes) || 10));
    const expires = new Date(Date.now() + windowMinutes * 60_000).toISOString();
    const { error } = await admin.from("developer_reauth_sessions").upsert({ session_id: sessionId, developer_id: user.id, reauthenticated_at: new Date().toISOString(), expires_at: expires, ip_address: ip }, { onConflict: "session_id" });
    if (error) return done({ error: error.message, code: "reauth_store_failed" });
    await audit("fresh_mfa_verified", "session", sessionId, { expires_at: expires, ip_address: ip });
    return done({ success: true, expires_at: expires });
  }

  if (action === "disable_ip_allowlist_recovery") {
    if (!developer.is_owner) return done({ error: "Developer owner access required.", code: "owner_required" });
    if (!await hasFreshReauth()) return done({ error: "Fresh MFA verification required.", code: "reauthentication_required" });
    const next = { ...system, developer_ip_allowlist_enabled: false };
    const { error } = await admin.from("runtime_controls").update({ config: next, updated_by: user.id, updated_at: new Date().toISOString() }).eq("key", "system");
    if (error) return done({ error: error.message });
    await audit("disable_ip_allowlist_recovery", "system", "system", { ip_address: ip });
    return done({ success: true });
  }

  if (freshRequired.has(action) && !await hasFreshReauth()) return done({ error: "Fresh MFA verification required for this control.", code: "reauthentication_required" });

  if (action === "summary") {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [users, sessions, events, restrictions, alerts] = await Promise.all([
      admin.rpc("developer_user_overview"), admin.rpc("developer_session_overview"),
      admin.from("runtime_events").select("severity,event_type,created_at").gte("created_at", since),
      admin.from("access_restrictions").select("id", { count: "exact", head: true }).eq("active", true),
      admin.from("developer_alerts").select("id", { count: "exact", head: true }).is("acknowledged_at", null),
    ]);
    if (users.error || sessions.error) return done({ error: users.error?.message ?? sessions.error?.message });
    const userRows = users.data ?? [], sessionRows = sessions.data ?? [], eventRows = events.data ?? [];
    const byStatus: Record<string, number> = {}, bySeverity: Record<string, number> = {};
    for (const row of userRows) byStatus[row.access_status] = (byStatus[row.access_status] ?? 0) + 1;
    for (const row of eventRows) bySeverity[row.severity] = (bySeverity[row.severity] ?? 0) + 1;
    return done({ users: { total: userRows.length, by_status: byStatus }, sessions: { total: sessionRows.length, revoked: sessionRows.filter((r: Record<string, unknown>) => r.revoked).length }, health_24h: { total_events: eventRows.length, by_severity: bySeverity }, restrictions: { active: restrictions.count ?? 0 }, alerts: { unacknowledged: alerts.count ?? 0 }, system, developer: { user_id: user.id, email: user.email, is_owner: developer.is_owner, permissions: developer.permissions, aal, current_ip: ip } });
  }

  if (action === "list_users") {
    const { data, error } = await admin.rpc("developer_user_overview"); if (error) return done({ error: error.message });
    const query = asString(payload.query, 120).toLowerCase(); let rows = data ?? [];
    if (query) rows = rows.filter((r: Record<string, unknown>) => [r.email,r.full_name,r.first_name,r.last_name,r.campus,...(Array.isArray(r.roles)?r.roles:[])].some(v => typeof v === "string" && v.toLowerCase().includes(query)));
    return done({ users: rows.slice(0, 500) });
  }

  if (action === "list_sessions") {
    const { data, error } = await admin.rpc("developer_session_overview"); if (error) return done({ error: error.message });
    const rows = (data ?? []).map((r: Record<string, unknown>) => { const parsed = parseUserAgent(typeof r.user_agent === "string" ? r.user_agent : null); return { ...r, device_type: r.device_type || parsed.device, browser_name: r.browser_name || parsed.browser, browser_version: r.browser_version || parsed.version, operating_system: r.operating_system || parsed.os }; });
    const query = asString(payload.query, 120).toLowerCase();
    const filtered = query ? rows.filter((r: Record<string, unknown>) => [r.email,r.full_name,r.ip_address,r.browser_name,r.operating_system,r.device_type,r.city,r.region,r.country_code].some(v => typeof v === "string" && v.toLowerCase().includes(query))) : rows;
    return done({ sessions: filtered.slice(0, 500) });
  }

  if (action === "list_restrictions") {
    const { data, error } = await admin.from("access_restrictions").select("*").order("created_at", { ascending: false }).limit(500); return done(error ? { error: error.message } : { restrictions: data ?? [] });
  }
  if (action === "list_features") {
    const [flags, overrides, rules] = await Promise.all([admin.from("feature_flags").select("*").order("key"), admin.from("feature_flag_overrides").select("*").order("updated_at", { ascending: false }).limit(500), admin.from("feature_flag_rules").select("*").order("priority", { ascending: false }).limit(500)]);
    if (flags.error || overrides.error || rules.error) return done({ error: flags.error?.message ?? overrides.error?.message ?? rules.error?.message });
    return done({ flags: flags.data ?? [], overrides: overrides.data ?? [], rules: rules.data ?? [] });
  }
  if (action === "list_runtime") {
    const now = new Date().toISOString(); const [campuses, windows] = await Promise.all([admin.from("campus_runtime_controls").select("*").order("campus"), admin.from("maintenance_windows").select("*").order("starts_at", { ascending: false }).limit(200)]);
    return done(campuses.error || windows.error ? { error: campuses.error?.message ?? windows.error?.message } : { campuses: campuses.data ?? [], windows: windows.data ?? [], now });
  }
  if (action === "list_security") {
    const [anomalies, alerts, rules] = await Promise.all([admin.from("security_anomalies").select("*").order("created_at", { ascending: false }).limit(300), admin.from("developer_alerts").select("*").order("created_at", { ascending: false }).limit(300), admin.from("developer_alert_rules").select("*").order("rule_key")]);
    return done(anomalies.error || alerts.error || rules.error ? { error: anomalies.error?.message ?? alerts.error?.message ?? rules.error?.message } : { anomalies: anomalies.data ?? [], alerts: alerts.data ?? [], rules: rules.data ?? [] });
  }
  if (action === "list_ip_allowlist") {
    const { data, error } = await admin.from("developer_ip_allowlist").select("*").eq("developer_id", user.id).order("created_at", { ascending: false }); return done(error ? { error: error.message } : { entries: data ?? [], enabled: ipGateEnabled, current_ip: ip, current_ip_allowed: ipAllowed });
  }
  if (action === "list_health") {
    const hours = Math.max(1, Math.min(168, Number(payload.hours) || 24)); const since = new Date(Date.now() - hours * 3_600_000).toISOString();
    const { data, error } = await admin.from("runtime_events").select("id,user_id,auth_session_id,device_hash,ip_address,edge_function,event_type,severity,route,message,duration_ms,status_code,metadata,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(500); if (error) return done({ error: error.message });
    const rows = data ?? [], bySeverity: Record<string,number> = {}, byType: Record<string,number> = {}; let totalDuration=0,durationCount=0;
    for (const row of rows) { bySeverity[row.severity]=(bySeverity[row.severity]??0)+1; byType[row.event_type]=(byType[row.event_type]??0)+1; if(typeof row.duration_ms==="number"){totalDuration+=row.duration_ms;durationCount++;} }
    return done({ hours, summary: { total: rows.length, by_severity: bySeverity, by_type: byType, average_duration_ms: durationCount ? Math.round(totalDuration/durationCount) : null, rls_denials: rows.filter(r => r.status_code === 403 || r.message === "access_denied").length }, events: rows });
  }
  if (action === "database_health") { const { data, error } = await admin.rpc("developer_database_health"); return done(error ? { error: error.message } : { health: data }); }
  if (action === "metrics") { const { data, error } = await admin.rpc("developer_operational_metrics", { p_minutes: Math.max(1, Math.min(10080, Number(payload.minutes)||60)) }); return done(error ? { error: error.message } : { metrics: data }); }
  if (action === "release_info") { const { data, error } = await admin.rpc("developer_release_info"); return done(error ? { error: error.message } : { release: data }); }
  if (action === "list_audit") { const { data, error } = await admin.from("developer_audit_logs").select("*").order("created_at", { ascending:false }).limit(1000); return done(error ? { error:error.message } : { audit:data??[] }); }
  if (action === "role_diagnostics") {
    const [rolesResult, flagsResult, campusResult] = await Promise.all([admin.from("user_roles").select("role,user_id"), admin.from("feature_flags").select("key,enabled").order("key"), admin.from("profiles").select("campus")]);
    if (rolesResult.error || flagsResult.error || campusResult.error) return done({ error: rolesResult.error?.message ?? flagsResult.error?.message ?? campusResult.error?.message });
    const roleCounts: Record<string,number> = {}, campusCounts: Record<string,number> = {}; for(const row of rolesResult.data??[]) roleCounts[String(row.role)]=(roleCounts[String(row.role)]??0)+1; for(const row of campusResult.data??[]){const c=String(row.campus??"unassigned");campusCounts[c]=(campusCounts[c]??0)+1;}
    return done({ diagnostics: { role_counts:roleCounts, campus_counts:campusCounts, features:flagsResult.data??[], routes: { student:["/dashboard","/profile","/pilot"], security:["/security","/office","/judiciary"], admin:["/admin","/security","/office","/judiciary"], developer:["/developer"] }, note:"Read-only diagnostic model. No identity impersonation or session switching is performed." } });
  }

  if (action === "set_system") {
    const patch = objectValue(payload.config), next = { ...system, ...patch }; if (next.mode && !["live","read_only","maintenance","locked"].includes(String(next.mode))) return done({ error:"Invalid system mode" });
    const { error } = await admin.from("runtime_controls").update({ config:next, updated_by:user.id, updated_at:new Date().toISOString() }).eq("key","system"); if(error)return done({error:error.message}); await audit("set_system","system","system",{patch}); return done({success:true,config:next});
  }
  if (action === "set_campus_mode") {
    const campus=asString(payload.campus,80),mode=asString(payload.mode,30),message=asString(payload.message,1000); if(!campus||!["live","read_only","maintenance","locked"].includes(mode))return done({error:"Invalid campus control"});
    const { error }=await admin.from("campus_runtime_controls").update({mode,message:message||null,updated_by:user.id,updated_at:new Date().toISOString()}).eq("campus",campus);if(error)return done({error:error.message});await audit("set_campus_mode","campus",campus,{mode,message});return done({success:true});
  }
  if (action === "create_maintenance") {
    const scope=asString(payload.scope,20),mode=asString(payload.mode,30),campus=asString(payload.campus,80)||null,moduleKey=asString(payload.module_key,120)||null,message=asString(payload.message,1000)||null,startsAt=asString(payload.starts_at,80),endsAt=asString(payload.ends_at,80);if(!["global","campus","module"].includes(scope)||!["read_only","maintenance","locked"].includes(mode)||!startsAt||!endsAt)return done({error:"Invalid maintenance window"});
    const {data,error}=await admin.from("maintenance_windows").insert({scope,mode,campus:scope==="campus"?campus:null,module_key:scope==="module"?moduleKey:null,message,starts_at:startsAt,ends_at:endsAt,created_by:user.id}).select("*").single();if(error)return done({error:error.message});await audit("create_maintenance",scope,data.id,{mode,campus,module_key:moduleKey,starts_at:startsAt,ends_at:endsAt});return done({success:true,window:data});
  }
  if (action === "cancel_maintenance") { const id=asString(payload.id,64);const {error}=await admin.from("maintenance_windows").update({active:false,updated_at:new Date().toISOString()}).eq("id",id);if(error)return done({error:error.message});await audit("cancel_maintenance","maintenance_window",id);return done({success:true}); }
  if (action === "set_user_access") {
    const userId=asString(payload.user_id,64),status=asString(payload.status,32),reason=asString(payload.reason,1000);if(!userId||!["approved","suspended","blocked","quarantined"].includes(status))return done({error:"Invalid user access request"});
    const values:Record<string,unknown>={status,reason:reason||null,updated_at:new Date().toISOString()};if(status==="approved"){values.approved_by=user.id;values.approved_at=new Date().toISOString();}
    const {error}=await admin.from("user_access").upsert({user_id:userId,...values},{onConflict:"user_id"});if(error)return done({error:error.message});let revoked=0;if(["blocked","suspended"].includes(status)){const r=await admin.rpc("developer_revoke_user_sessions",{target_user_id:userId,revoke_reason:reason||`Access ${status}`});if(r.error)return done({error:r.error.message});revoked=r.data??0;}await audit("set_user_access","user",userId,{status,reason,revoked_sessions:revoked});return done({success:true,revoked_sessions:revoked});
  }
  if (action === "block") {
    const kind=asString(payload.kind,20),value=asString(payload.value,500),reason=asString(payload.reason,1000)||"Developer restriction";if(!["user","email","ip","device","session"].includes(kind)||!value)return done({error:"Invalid restriction"});const record:Record<string,unknown>={restriction_kind:kind,reason,created_by:user.id,active:true};if(kind==="user")record.target_user_id=value;if(kind==="email")record.target_email=value.toLowerCase();if(kind==="ip")record.target_ip=value;if(kind==="device")record.target_device_hash=value;if(kind==="session")record.target_session_id=value;const {data,error}=await admin.from("access_restrictions").insert(record).select("*").single();if(error)return done({error:error.message});if(kind==="user"){await admin.from("user_access").upsert({user_id:value,status:"blocked",reason,updated_at:new Date().toISOString()},{onConflict:"user_id"});await admin.rpc("developer_revoke_user_sessions",{target_user_id:value,revoke_reason:reason});}if(kind==="session")await admin.rpc("developer_revoke_session",{target_session_id:value,revoke_reason:reason});await audit("block",kind,value,{restriction_id:data.id,reason});return done({success:true,restriction:data});
  }
  if (action === "unblock") { const id=asString(payload.restriction_id,64);const {data:existing,error:readError}=await admin.from("access_restrictions").select("*").eq("id",id).maybeSingle();if(readError||!existing)return done({error:readError?.message??"Restriction not found"});const {error}=await admin.from("access_restrictions").update({active:false,updated_at:new Date().toISOString()}).eq("id",id);if(error)return done({error:error.message});if(existing.restriction_kind==="user"&&existing.target_user_id)await admin.from("user_access").update({status:"approved",reason:null,approved_by:user.id,approved_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("user_id",existing.target_user_id);await audit("unblock",existing.restriction_kind,id,{target:existing});return done({success:true}); }
  if (action === "revoke_session") { const id=asString(payload.session_id,64),reason=asString(payload.reason,1000)||"Revoked by developer";const r=await admin.rpc("developer_revoke_session",{target_session_id:id,revoke_reason:reason});if(r.error)return done({error:r.error.message});await audit("revoke_session","session",id,{reason});return done({success:Boolean(r.data)}); }
  if (action === "revoke_user_sessions") { const id=asString(payload.user_id,64),reason=asString(payload.reason,1000)||"Revoked by developer";const r=await admin.rpc("developer_revoke_user_sessions",{target_user_id:id,revoke_reason:reason});if(r.error)return done({error:r.error.message});await audit("revoke_user_sessions","user",id,{reason,session_count:r.data??0});return done({success:true,revoked_sessions:r.data??0}); }
  if (action === "toggle_feature") { const key=asString(payload.key,120),enabled=payload.enabled;if(!key||typeof enabled!=="boolean")return done({error:"Feature key and state required"});const {error}=await admin.from("feature_flags").update({enabled,updated_by:user.id,updated_at:new Date().toISOString()}).eq("key",key);if(error)return done({error:error.message});await audit("toggle_feature","feature",key,{enabled});return done({success:true}); }
  if (action === "set_feature_override") { const key=asString(payload.key,120),userId=asString(payload.user_id,64),enabled=payload.enabled,reason=asString(payload.reason,1000);if(!key||!userId||typeof enabled!=="boolean")return done({error:"Feature, user and state required"});const {error}=await admin.from("feature_flag_overrides").upsert({feature_key:key,user_id:userId,enabled,reason:reason||null,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:"feature_key,user_id"});if(error)return done({error:error.message});await audit("set_feature_override","user_feature",`${userId}:${key}`,{enabled,reason});return done({success:true}); }
  if (action === "remove_feature_override") { const key=asString(payload.key,120),userId=asString(payload.user_id,64);const {error}=await admin.from("feature_flag_overrides").delete().eq("feature_key",key).eq("user_id",userId);if(error)return done({error:error.message});await audit("remove_feature_override","user_feature",`${userId}:${key}`);return done({success:true}); }
  if (action === "create_feature_rule") {
    const featureKey=asString(payload.feature_key,120),enabled=payload.enabled,rollout=payload.rollout_percent==null?null:Number(payload.rollout_percent),campuses=Array.isArray(payload.campuses)?payload.campuses:[],rolesPayload=Array.isArray(payload.roles)?payload.roles:[],userIds=Array.isArray(payload.user_ids)?payload.user_ids:[],startsAt=asString(payload.starts_at,80)||null,endsAt=asString(payload.ends_at,80)||null,priority=Number(payload.priority)||100,reason=asString(payload.reason,1000)||null;if(!featureKey||typeof enabled!=="boolean"||(rollout!=null&&(rollout<0||rollout>100)))return done({error:"Invalid cohort rule"});const {data,error}=await admin.from("feature_flag_rules").insert({feature_key:featureKey,enabled,rollout_percent:rollout,campuses,roles:rolesPayload,user_ids:userIds,starts_at:startsAt,ends_at:endsAt,priority,reason,created_by:user.id}).select("*").single();if(error)return done({error:error.message});await audit("create_feature_rule","feature_rule",data.id,{feature_key:featureKey,enabled,rollout,campuses,roles:rolesPayload,user_ids:userIds});return done({success:true,rule:data});
  }
  if (action === "delete_feature_rule") { const id=asString(payload.id,64);const {error}=await admin.from("feature_flag_rules").delete().eq("id",id);if(error)return done({error:error.message});await audit("delete_feature_rule","feature_rule",id);return done({success:true}); }
  if (action === "add_ip_allow") { const network=asString(payload.network,100),label=asString(payload.label,200)||null;if(!network)return done({error:"CIDR/network required"});const {data,error}=await admin.from("developer_ip_allowlist").insert({developer_id:user.id,network,label}).select("*").single();if(error)return done({error:error.message});await audit("add_ip_allow","developer_ip",data.id,{network,label});return done({success:true,entry:data}); }
  if (action === "remove_ip_allow") { const id=asString(payload.id,64);const {error}=await admin.from("developer_ip_allowlist").delete().eq("id",id).eq("developer_id",user.id);if(error)return done({error:error.message});await audit("remove_ip_allow","developer_ip",id);return done({success:true}); }
  if (action === "set_ip_allowlist") { const enabled=payload.enabled;if(typeof enabled!=="boolean")return done({error:"Enabled state required"});if(enabled){const {count}=await admin.from("developer_ip_allowlist").select("id",{count:"exact",head:true}).eq("developer_id",user.id).eq("enabled",true);if(!count)return done({error:"Add at least one allowed network before enabling IP restriction."});}const next={...system,developer_ip_allowlist_enabled:enabled};const {error}=await admin.from("runtime_controls").update({config:next,updated_by:user.id,updated_at:new Date().toISOString()}).eq("key","system");if(error)return done({error:error.message});await audit("set_ip_allowlist","system","system",{enabled});return done({success:true}); }
  if (action === "ack_alert") { const id=Number(payload.id);const {error}=await admin.from("developer_alerts").update({acknowledged_by:user.id,acknowledged_at:new Date().toISOString()}).eq("id",id);if(error)return done({error:error.message});await audit("ack_alert","alert",String(id));return done({success:true}); }
  if (action === "ack_anomaly") { const id=Number(payload.id),status=asString(payload.status,30)||"acknowledged";if(!["acknowledged","resolved","dismissed"].includes(status))return done({error:"Invalid anomaly status"});const {error}=await admin.from("security_anomalies").update({status,acknowledged_by:user.id,acknowledged_at:new Date().toISOString()}).eq("id",id);if(error)return done({error:error.message});await audit("ack_anomaly","anomaly",String(id),{status});return done({success:true}); }
  if (action === "set_alert_rule") { const key=asString(payload.rule_key,120),enabled=payload.enabled,threshold=Number(payload.threshold),windowMinutes=Number(payload.window_minutes),severity=asString(payload.severity,20);if(!key||typeof enabled!=="boolean"||!Number.isFinite(threshold)||!Number.isFinite(windowMinutes)||!["info","warning","error","critical"].includes(severity))return done({error:"Invalid alert rule"});const {error}=await admin.from("developer_alert_rules").update({enabled,threshold,window_minutes:windowMinutes,severity,updated_by:user.id,updated_at:new Date().toISOString()}).eq("rule_key",key);if(error)return done({error:error.message});await audit("set_alert_rule","alert_rule",key,{enabled,threshold,window_minutes:windowMinutes,severity});return done({success:true}); }
  if (action === "create_release_marker") { const kind=asString(payload.kind,30),version=asString(payload.version,100)||null,gitSha=asString(payload.git_sha,100)||null,branch=asString(payload.branch,200)||null,url=asString(payload.deployment_url,1000)||null,state=asString(payload.provider_state,100)||null,migration=asString(payload.migration_version,100)||null,notes=asString(payload.notes,2000)||null;if(!["release","rollback","backup_verification","checkpoint"].includes(kind))return done({error:"Invalid release marker"});const {data,error}=await admin.from("release_markers").insert({kind,version,git_sha:gitSha,branch,deployment_url:url,provider_state:state,migration_version:migration,notes,created_by:user.id}).select("*").single();if(error)return done({error:error.message});await audit("create_release_marker","release_marker",data.id,{kind,git_sha:gitSha,branch});return done({success:true,marker:data}); }
  if (action === "export_audit") { const {data,error}=await admin.from("developer_audit_logs").select("id,developer_id,action,target_type,target_id,details,created_at").order("created_at",{ascending:false}).limit(5000);if(error)return done({error:error.message});const header=["id","developer_id","action","target_type","target_id","details","created_at"],lines=[header.join(","),...(data??[]).map(r=>header.map(k=>csvCell((r as Record<string,unknown>)[k])).join(","))];await audit("export_audit","audit","csv",{rows:data?.length??0});return done({filename:`ccsf-developer-audit-${new Date().toISOString().slice(0,10)}.csv`,csv:lines.join("\n")}); }

  return done({ error: "Unknown action", code: "unknown_action" }, 400);
});
