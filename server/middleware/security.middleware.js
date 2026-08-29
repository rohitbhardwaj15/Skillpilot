import crypto from 'crypto';

/*
 * Rate limiting
 * -------------
 * Two backends behind one `rateLimit()` interface:
 *
 *   - In-memory Map: fine for a single long-running Node process, but each
 *     serverless instance (e.g. on Vercel) gets its OWN Map, so a limit of
 *     "60/min" actually becomes "60/min PER INSTANCE" — not a real limit
 *     under multi-instance/serverless scaling.
 *   - Upstash Redis (REST API, no extra npm dependency — just `fetch`):
 *     a single shared counter across every instance. Used automatically
 *     when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set.
 *
 * If Redis is configured but a call to it fails (network blip, outage),
 * the limiter falls back to the in-memory counter for that request rather
 * than failing closed — an unavailable rate limiter should degrade
 * availability protection, not take the whole API down with it.
 */

const buckets = new Map();
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useDistributedLimiter = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

function inMemoryIncr(bucketKey, windowMs) {
  const now = Date.now();
  const current = buckets.get(bucketKey);
  if (!current || now - current.start >= windowMs) {
    buckets.set(bucketKey, { start: now, count: 1 });
    return { count: 1, retryAfterMs: windowMs };
  }
  current.count += 1;
  return { count: current.count, retryAfterMs: windowMs - (now - current.start) };
}

/** Atomically increments the shared counter for `key` and sets its
 * expiry on first use, via one pipelined Upstash REST call. */
async function redisIncr(bucketKey, windowMs) {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const response = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', bucketKey],
      // NX: only set the expiry the first time the key is created, so a
      // long-lived key isn't accidentally kept alive forever by later hits.
      ['EXPIRE', bucketKey, String(windowSeconds), 'NX'],
    ]),
  });

  if (!response.ok) {
    throw new Error(`Upstash rate limit request failed (${response.status})`);
  }

  const results = await response.json();
  const count = Number(results?.[0]?.result);
  if (!Number.isFinite(count)) {
    throw new Error('Upstash rate limit returned an unexpected response shape');
  }

  return { count, retryAfterMs: windowMs };
}

export function rateLimit({ windowMs = 60_000, max = 60, key = (req) => req.ip || 'anonymous' } = {}) {
  return async (req, res, next) => {
    const bucketKey = `ratelimit:${key(req)}:${windowMs}:${max}`;

    let result;
    if (useDistributedLimiter) {
      try {
        result = await redisIncr(bucketKey, windowMs);
      } catch (err) {
        console.warn('Distributed rate limiter unavailable, falling back to in-memory for this request:', err.message);
        result = inMemoryIncr(bucketKey, windowMs);
      }
    } else {
      result = inMemoryIncr(bucketKey, windowMs);
    }

    if (result.count > max) {
      res.set('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }

    next();
  };
}

export function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  });
  next();
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
