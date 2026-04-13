// Netlify Function: Send push notification
// Can send to a specific subscription OR to all subscriptions for a userId

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@ebconstructors.com";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Simple in-memory rate limiter (per function instance)
const rateBuckets = new Map();
function checkRateLimit(ip, max = 10, windowSec = 60) {
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

  // Rate limit: 10 push sends per IP per minute
  const clientIp = event.headers["x-forwarded-for"] || event.headers["client-ip"] || "unknown";
  if (!checkRateLimit(clientIp, 10, 60)) {
    return {
      statusCode: 429,
      headers: { ...corsHeaders(), "Retry-After": "60" },
      body: JSON.stringify({ ok: false, message: "Rate limit exceeded. Try again in 60 seconds." }),
    };
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, message: "VAPID keys not configured" }),
    };
  }

  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    const { subscription, userId, title, body, tag, url } = JSON.parse(event.body);

    if (!title) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ ok: false, message: "title required" }),
      };
    }

    const payload = JSON.stringify({
      title,
      body: body || "",
      tag: tag || "ebc-notification",
      url: url || "/",
      icon: "/ebc-logo.png",
    });

    // If a specific subscription is provided, send to it directly
    if (subscription) {
      await sendToSubscription(subscription, payload);
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ ok: true, sent: 1 }),
      };
    }

    // If userId is provided, look up all subscriptions for that user from Supabase
    if (userId && supabase) {
      const { data: subs, error } = await supabase
        .from("push_subscriptions")
        .select("endpoint, keys_p256dh, keys_auth")
        .eq("user_id", userId);

      if (error) {
        console.error("[push] lookup error:", error.message);
        return {
          statusCode: 500,
          headers: corsHeaders(),
          body: JSON.stringify({ ok: false, message: "Failed to look up subscriptions" }),
        };
      }

      if (!subs || subs.length === 0) {
        return {
          statusCode: 200,
          headers: corsHeaders(),
          body: JSON.stringify({ ok: true, sent: 0, message: "No subscriptions found for user" }),
        };
      }

      let sent = 0;
      const expired = [];
      for (const sub of subs) {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        };
        try {
          await webpush.sendNotification(pushSub, payload);
          sent++;
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            expired.push(sub.endpoint);
          } else {
            console.warn("[push] send error:", err.message);
          }
        }
      }

      // Clean up expired subscriptions
      if (expired.length > 0 && supabase) {
        await supabase.from("push_subscriptions").delete().in("endpoint", expired);
        console.log(`[push] Cleaned up ${expired.length} expired subscriptions`);
      }

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ ok: true, sent, expired: expired.length }),
      };
    }

    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, message: "subscription or userId required" }),
    };
  } catch (err) {
    console.error("[push] send failed:", err.message);
    const status = err.statusCode === 410 ? 410 : 500;
    return {
      statusCode: status,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, message: err.message }),
    };
  }
}

async function sendToSubscription(sub, payload) {
  await webpush.sendNotification(sub, payload);
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}
