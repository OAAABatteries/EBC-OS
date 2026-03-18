// Netlify Function: Store push subscription
// In production, subscriptions would go to Supabase. For now, we store in-memory
// and provide the endpoint for the client to register.

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders(), body: "Method Not Allowed" };
  }

  try {
    const { subscription, userId, action } = JSON.parse(event.body);

    if (action === "subscribe" && subscription) {
      // In production: save to Supabase push_subscriptions table
      // For now, return success so the client flow works end-to-end
      console.log(`[push] User ${userId} subscribed:`, subscription.endpoint);
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ ok: true, message: "Subscription registered" }),
      };
    }

    if (action === "unsubscribe") {
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
