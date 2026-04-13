// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Client-Side Request Rate Limiter
//  Prevents burst API calls from the client. Uses a simple
//  sliding window counter per endpoint key.
// ═══════════════════════════════════════════════════════════════

const windows = new Map();

/**
 * Check if a request is allowed under rate limit.
 * @param {string} key - identifier (e.g., table name or endpoint)
 * @param {number} maxRequests - max requests per window (default: 30)
 * @param {number} windowMs - window duration in ms (default: 60s)
 * @returns {boolean} true if allowed
 */
export function isAllowed(key, maxRequests = 30, windowMs = 60_000) {
  const now = Date.now();
  if (!windows.has(key)) windows.set(key, []);

  const timestamps = windows.get(key).filter(t => now - t < windowMs);
  windows.set(key, timestamps);

  if (timestamps.length >= maxRequests) return false;

  timestamps.push(now);
  return true;
}

/**
 * Wrap a fetch/mutation call with rate limiting.
 * @param {string} key - rate limit bucket key
 * @param {Function} fn - async function to execute
 * @param {object} [opts] - { maxRequests, windowMs }
 * @returns {Promise} result of fn, or throws on rate limit
 */
export async function rateLimited(key, fn, opts = {}) {
  const { maxRequests = 30, windowMs = 60_000 } = opts;
  if (!isAllowed(key, maxRequests, windowMs)) {
    throw new Error(`Rate limit exceeded for ${key}. Try again shortly.`);
  }
  return fn();
}

/**
 * Get remaining quota for a key
 */
export function getRemaining(key, maxRequests = 30, windowMs = 60_000) {
  const now = Date.now();
  const timestamps = (windows.get(key) || []).filter(t => now - t < windowMs);
  return Math.max(0, maxRequests - timestamps.length);
}
