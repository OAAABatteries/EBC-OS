-- ═══════════════════════════════════════════════════════════════
--  Push Subscriptions table for web-push notifications
--  Stores VAPID push subscriptions per user per browser
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL,
  endpoint    TEXT NOT NULL UNIQUE,  -- unique per browser
  keys_p256dh TEXT NOT NULL,
  keys_auth   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up all subscriptions for a user
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON push_subscriptions(user_id);

-- Index for cleaning up by endpoint
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON push_subscriptions(endpoint);

-- RLS: Allow authenticated users to manage their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow the anon key (used by Netlify Functions) full access
CREATE POLICY "Allow anon full access to push_subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);
