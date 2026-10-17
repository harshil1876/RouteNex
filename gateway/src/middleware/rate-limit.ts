import type { MiddlewareHandler } from 'hono';
import type { ApiError } from '../schemas.js';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * Creates in-memory rate limiting middleware per client IP.
 */
export function createRateLimitMiddleware(
  limit: number = 60,
  windowMs: number = 60000
): MiddlewareHandler {
  const tracker = new Map<string, RateLimitRecord>();

  // Periodically purge expired IP records
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of tracker.entries()) {
      if (now > record.resetAt) {
        tracker.delete(ip);
      }
    }
  }, windowMs);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return async (c, next) => {
    // Skip rate limiting for health endpoints and OPTIONS
    const path = c.req.path;
    if (path === '/health' || path === '/health/live' || c.req.method === 'OPTIONS') {
      return next();
    }

    const forwarded = c.req.header('x-forwarded-for');
    const ip =
      forwarded?.split(',')[0].trim() ||
      c.req.header('x-real-ip') ||
      '127.0.0.1';

    const now = Date.now();
    let record = tracker.get(ip);

    if (!record || now > record.resetAt) {
      if (tracker.size >= 5000) {
        const oldestIp = tracker.keys().next().value;
        if (oldestIp) tracker.delete(oldestIp);
      }
      record = { count: 1, resetAt: now + windowMs };
      tracker.set(ip, record);
    } else {
      record.count++;
    }

    if (record.count > limit) {
      const retryAfterSec = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      c.header('Retry-After', retryAfterSec.toString());

      const errorPayload: ApiError = {
        error: {
          message: `Rate limit of ${limit} requests per minute exceeded. Please try again in ${retryAfterSec}s.`,
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded',
          param: null,
        },
      };
      return c.json(errorPayload, 429);
    }

    return next();
  };
}
