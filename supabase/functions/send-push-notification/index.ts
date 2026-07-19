import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return json({ error: "Unauthorized" }, 401);

  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .in("role", ["admin", "security"]);
  if (!roleData?.length) return json({ error: "Only authorised staff can send push notifications" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const url = typeof body.url === "string" ? body.url : "/dashboard";
  const type = typeof body.type === "string" ? body.type : "general";
  const userId = typeof body.userId === "string" ? body.userId : null;
  const userIds = Array.isArray(body.userIds)
    ? body.userIds.filter((value): value is string => typeof value === "string").slice(0, 500)
    : [];

  if ((!userId && userIds.length === 0) || !title || !message) {
    return json({ error: "userId or userIds, title and message are required" }, 400);
  }
  if (title.length > 200 || message.length > 1000) {
    return json({ error: "Notification content exceeds the allowed length" }, 400);
  }

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return json({
      success: false,
      delivery_status: "not_configured",
      sent: 0,
      failed: 0,
      message: "Web Push delivery is not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT.",
    }, 503);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  let subscriptionQuery = adminClient
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_id");
  subscriptionQuery = userIds.length > 0
    ? subscriptionQuery.in("user_id", userIds)
    : subscriptionQuery.eq("user_id", userId!);

  const { data: subscriptions, error: subscriptionError } = await subscriptionQuery;
  if (subscriptionError) {
    console.error("Unable to fetch push subscriptions", subscriptionError);
    return json({ error: "Unable to fetch push subscriptions" }, 500);
  }
  if (!subscriptions?.length) {
    return json({ success: true, delivery_status: "no_subscriptions", sent: 0, failed: 0 });
  }

  const payload = JSON.stringify({
    title,
    body: message,
    icon: "/app-icon-192.png",
    badge: "/app-icon-192.png",
    tag: type,
    data: { url, type },
    vibrate: [200, 100, 200],
    requireInteraction: type === "chat",
  });

  let sent = 0;
  let failed = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload);
      sent += 1;
    } catch (error) {
      failed += 1;
      const statusCode = typeof error === "object" && error && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : 0;
      console.error("Web Push delivery failed", { subscriptionId: subscription.id, statusCode });
      if (statusCode === 404 || statusCode === 410) {
        await adminClient.from("push_subscriptions").delete().eq("id", subscription.id);
      }
    }
  }

  const deliveryStatus = failed === 0 ? "delivered" : sent > 0 ? "partial" : "failed";
  return json({
    success: sent > 0,
    delivery_status: deliveryStatus,
    sent,
    failed,
  }, sent > 0 ? 200 : 502);
});
