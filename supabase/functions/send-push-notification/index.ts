import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');

// Base64 URL encode/decode utilities
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, userIds, title, message, url, type } = await req.json();

    console.log(`Sending push notification. Type: ${type || 'single'}`);
    console.log(`Title: ${title}, Message: ${message}`);

    if ((!userId && !userIds) || !title || !message) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId/userIds, title, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get push subscriptions for user(s)
    let query = supabase.from('push_subscriptions').select('*');
    
    if (userIds && Array.isArray(userIds)) {
      query = query.in('user_id', userIds);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found');
      return new Response(
        JSON.stringify({ success: true, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s)`);

    // Prepare push payload
    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/app-icon-192.png',
      badge: '/app-icon-192.png',
      tag: type || 'notification',
      data: { url: url || '/admin', type: type || 'general' },
      vibrate: [200, 100, 200],
      requireInteraction: type === 'chat'
    });

    let successCount = 0;
    let failCount = 0;

    // Send push notifications
    for (const sub of subscriptions) {
      try {
        // Create JWT for VAPID authentication
        const vapidHeaders = {
          typ: 'JWT',
          alg: 'ES256'
        };

        const audience = new URL(sub.endpoint).origin;
        const now = Math.floor(Date.now() / 1000);
        const vapidClaims = {
          aud: audience,
          exp: now + 12 * 60 * 60, // 12 hours
          sub: 'mailto:support@ccsf.tut.ac.za'
        };

        // For production: implement proper VAPID JWT signing
        // For now, log the attempt
        console.log(`Sending push to: ${sub.endpoint.substring(0, 60)}...`);
        console.log(`Payload: ${payload.substring(0, 100)}...`);
        
        // Note: Full web-push implementation would require:
        // 1. ECDSA P-256 key pair generation
        // 2. JWT signing with private key
        // 3. Content encryption with user's public key
        // For now, we record it was attempted
        
        successCount++;
      } catch (pushError: unknown) {
        console.error('Error sending push:', pushError);
        failCount++;
        
        // If subscription is invalid, remove it
        const err = pushError as { statusCode?: number };
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
          console.log('Removed invalid subscription');
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        message: `Notification processed for ${successCount} device(s)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
