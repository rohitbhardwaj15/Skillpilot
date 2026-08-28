import crypto from 'crypto';

const buckets = new Map();

// Lightweight dependency-free rate limiter suitable for a single Vercel/Node instance.
// For multi-instance production, replace with Redis-backed limiting.
export function rateLimit({ windowMs = 60_000, max = 60, key = (req) => req.ip || 'anonymous' } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = `${key(req)}`;
    const current = buckets.get(bucketKey);
    if (!current || now - current.start >= windowMs) {
      buckets.set(bucketKey, { start: now, count: 1 });
      return next();
    }
    current.count += 1;
    if (current.count > max) {
      const retryAfter = Math.ceil((windowMs - (now - current.start)) / 1000);
      res.set('Retry-After', String(retryAfter));
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
