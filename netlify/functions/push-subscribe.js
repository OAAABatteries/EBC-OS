// Netlify Function: Store push subscription in Supabase
// Falls back to in-memory logging if Supabase is not configured

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Simple in-memory rate limiter (per function instance)
const rateBuckets = new Map();
function checkRateLimit(ip, max = 5, windowSec = 60) {
  const now = Date.now();
  const key = ip || "unknown";
  const bucket = rateBuckets.get(key) || [];
  const recent = bucket.filter(t => now - t < windowSec * 1000);
  rateBuckets.set(key, recent);
  if (recent.length >= max) return false;
  recent.push(now);
  return true;
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders(), body: "Method Not Allowed" };
  }

  // Rate limit: 5 subscribe/unsubscribe per IP per minute
  const clientIp = event.headers["x-forwarded-for"] || event.headers["client-ip"] || "unknown";
  if (!checkRateLimit(clientIp, 5, 60)) {
    return {
      statusCode: 429,
      headers: { ...corsHeaders(), "Retry-After": "60" },
      body: JSON.stringify({ ok: false, message: "Rate limit exceeded" }),
    };
  }

  try {
    const { subscription, userId, action } = JSON.parse(event.body);

    if (action === "subscribe" && subscription) {
      if (supabase) {
        // Upsert subscription keyed by endpoint (one per browser per user)
        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: userId,
            endpoint: subscription.endpoint,
            keys_p256dh: subscription.keys?.p256dh || "",
            keys_auth: subscription.keys?.auth || "",
            expires_at: subscription.expirationTime || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "endpoint" }
        );
        if (error) console.warn("[push] Supabase upsert error:", error.message);
      }
      console.log(`[push] User ${userId} subscribed:`, subscription.endpoint?.slice(0, 60));
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ ok: true, message: "Subscription registered" }),
      };
    }

    if (action === "unsubscribe") {
      if (supabase && subscription?.endpoint) {
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
        if (error) console.warn("[push] Supabase delete error:", error.message);
      }
      console.log(`[push] User ${userId} unsubscribed`);
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ ok: true, message: "Subscription removed" }),
      };
    }

    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, message: "Invalid action" }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, message: err.message }),
    };
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}
