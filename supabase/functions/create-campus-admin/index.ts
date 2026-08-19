import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const CAMPUSES = ["pretoria_west_main", "arcadia", "arts", "giyani", "mbombela", "polokwane", "garankuwa", "soshanguve_south", "soshanguve_north", "emalahleni"];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async (req) => {
  const started = Date.now();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!, anonKey = Deno.env.get("SUPABASE_ANON_KEY")!, serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return json({ error: "Unauthorized" }, 401);
  const { data: accessAllowed, error: accessError } = await callerClient.rpc("current_app_access_allowed");
  if (accessError || accessAllowed !== true) return json({ error: "CCSF access is restricted by the developer control plane", code: "developer_access_denied" }, 403);
  const { data: adminPortalEnabled } = await adminClient.rpc("effective_feature_enabled", { p_feature_key: "admin_portal", p_user_id: caller.id });
  if (adminPortalEnabled !== true) return json({ error: "Admin provisioning is disabled by the developer control plane", code: "feature_disabled" }, 409);

  let payload: Record<string, unknown>; try { payload = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "", password = typeof payload.password === "string" ? payload.password : "", fullName = typeof payload.full_name === "string" ? payload.full_name.trim() : "", campus = typeof payload.campus === "string" ? payload.campus : "", isHead = payload.is_head === true;
  if (!email || !password || !fullName || !campus) return json({ error: "Email, password, full name and campus are required" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email address" }, 400);
  if (password.length < 12) return json({ error: "Password must be at least 12 characters" }, 400);
  if (!CAMPUSES.includes(campus)) return json({ error: "Invalid campus" }, 400);

  const { data: roles, error: rolesError } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id);
  if (rolesError) return json({ error: "Unable to verify permissions" }, 500);
  const isSuperAdmin = roles?.some((row) => row.role === "admin") ?? false;
  let isCampusHead = false;
  if (!isSuperAdmin) {
    const { data: headAccess } = await adminClient.from("admin_access").select("id").eq("admin_id", caller.id).eq("campus", campus).eq("is_head", true).maybeSingle();
    isCampusHead = Boolean(headAccess);
  }
  if (!isSuperAdmin && !isCampusHead) return json({ error: "Only a super admin or the campus head can create an officer" }, 403);
  if (isHead && !isSuperAdmin) return json({ error: "Only a super admin can create a campus head" }, 403);

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName, role: "security", campus } });
  if (createError || !created.user) return json({ error: createError?.message || "Unable to create officer account" }, 400);
  const newUserId = created.user.id;
  const { error: profileError } = await adminClient.from("profiles").update({ full_name: fullName, campus, email }).eq("id", newUserId);
  if (profileError) console.error("Profile synchronisation failed", profileError);
  const { error: accessSetupError } = await adminClient.from("admin_access").upsert({ admin_id: newUserId, campus, is_head: isHead }, { onConflict: "admin_id,campus" });
  if (accessSetupError) return json({ error: "Officer account was created but campus access setup failed" }, 500);
  await adminClient.from("runtime_events").insert({ user_id: caller.id, edge_function: "create-campus-admin", event_type: "edge_invocation", severity: "info", duration_ms: Date.now() - started, metadata: { created_user_id: newUserId, campus, is_head: isHead } });
  return json({ success: true, message: "Campus officer created successfully", user: { id: newUserId, email } });
});
