import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async (req) => {
  const started = Date.now();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL"), anonKey = Deno.env.get("SUPABASE_ANON_KEY"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Server configuration error" }, 500);

  const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return json({ error: "Unauthorized" }, 401);
  const { data: accessAllowed, error: accessError } = await client.rpc("current_app_access_allowed");
  if (accessError || accessAllowed !== true) return json({ error: "CCSF access is restricted by the developer control plane", code: "developer_access_denied" }, 403);
  const { data: adminPortalEnabled } = await admin.rpc("effective_feature_enabled", { p_feature_key: "admin_portal", p_user_id: user.id });
  if (adminPortalEnabled !== true) return json({ error: "Admin controls are disabled by the developer control plane", code: "feature_disabled" }, 409);

  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!role) return json({ error: "Only super admins can request staff password resets" }, 403);
  let body: Record<string, unknown>; try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "A valid email address is required" }, 400);
  const origin = req.headers.get("origin");
  const redirectTo = origin ? `${origin}/auth` : undefined;
  const { error } = await client.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
  if (error) return json({ error: "Unable to send password reset email" }, 500);
  await admin.from("runtime_events").insert({ user_id: user.id, edge_function: "reset-staff-password", event_type: "edge_invocation", severity: "info", duration_ms: Date.now() - started, metadata: { target_email: email } });
  return json({ success: true, message: "Password reset email requested" });
});
