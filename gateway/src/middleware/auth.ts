import type { MiddlewareHandler } from 'hono';
import type { ApiError } from '../schemas.js';

/**
 * Creates authentication middleware enforcing Bearer token authentication.
 * Skips authentication if no API key is configured or for healthcheck endpoints.
 */
export function createAuthMiddleware(expectedApiKey?: string): MiddlewareHandler {
  return async (c, next) => {
    // If no API key configured, localhost dev mode allows all requests
    if (!expectedApiKey || expectedApiKey.trim().length === 0) {
      return next();
    }

    // Skip auth for health endpoints and CORS preflights
    const path = c.req.path;
    if (path === '/health' || path === '/health/live' || c.req.method === 'OPTIONS') {
      return next();
    }

    const authHeader = c.req.header('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const errorPayload: ApiError = {
        error: {
          message: 'Missing or malformed Authorization header. Expected Bearer token.',
          type: 'authentication_error',
          code: 'unauthorized',
          param: null,
        },
      };
      return c.json(errorPayload, 401);
    }

    const token = authHeader.slice(7).trim();
    if (token !== expectedApiKey) {
      const errorPayload: ApiError = {
        error: {
          message: 'Invalid API key provided.',
          type: 'authentication_error',
          code: 'invalid_api_key',
          param: null,
        },
      };
      return c.json(errorPayload, 401);
    }

    return next();
  };
}
