// Fixed-window limiter held in process memory. It resets on restart and is
// per instance, so replace it with a shared store before running multiple
// replicas that must agree on a quota.
const buckets = new Map();
const MAX_BUCKETS = 10000;

export function clientIp(request) {
  const headers = request && request.headers;
  if (!headers || typeof headers.get !== 'function') return 'unknown';
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first.slice(0, 64);
  }
  const real = (headers.get('x-real-ip') || '').trim();
  return real ? real.slice(0, 64) : 'unknown';
}

export function checkRateLimit(key, { limit, windowMs, now = Date.now() }) {
  if (!Number.isFinite(limit) || limit < 1) throw new Error('limit must be a positive number.');
  if (!Number.isFinite(windowMs) || windowMs < 1) throw new Error('windowMs must be a positive number.');
  const bucketKey = String(key || 'unknown');

  const current = buckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [candidate, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(candidate);
      }
      if (buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value);
    }
    const resetAt = now + windowMs;
    buckets.set(bucketKey, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, retryAfter: 0, resetAt };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      resetAt: current.resetAt
    };
  }

  current.count += 1;
  return { allowed: true, remaining: limit - current.count, retryAfter: 0, resetAt: current.resetAt };
}

export function resetRateLimits() {
  buckets.clear();
}
