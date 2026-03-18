// Netlify Function: Send push notification to a subscription
// Called internally (e.g., from material approval, schedule changes)

import webpush from "web-push";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@ebconstructors.com";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders(), body: "Method Not Allowed" };
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

    const { subscription, title, body, tag, url } = JSON.parse(event.body);

    if (!subscription || !title) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ ok: false, message: "subscription and title required" }),
      };
    }

    const payload = JSON.stringify({
      title,
      body: body || "",
      tag: tag || "ebc-notification",
      url: url || "/",
      icon: "/ebc-logo.png",
    });

    await webpush.sendNotification(subscription, payload);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error("[push] send failed:", err.message);
    // 410 = subscription expired/invalid
    const status = err.statusCode === 410 ? 410 : 500;
    return {
      statusCode: status,
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
