import type { MiddlewareHandler } from 'hono';
import type { ApiError } from '../schemas.js';
import type { AdminStore } from '../storage/admin-store.js';

/**
 * Creates authentication middleware enforcing Bearer token authentication.
 * Supports:
 * - Master API key authentication
 * - Virtual Client Key authentication (SHA-256 hashed rn-local-... / rn_live_...)
 * - Local Admin Session authentication (terminal setup token)
 * - Safe localhost dev mode with opt-in ROUTENEX_STRICT_AUTH
 */
export function createAuthMiddleware(expectedApiKey?: string, adminStore?: AdminStore): MiddlewareHandler {
  const strictAuth = process.env.ROUTENEX_STRICT_AUTH === 'true';

  return async (c, next) => {
    const path = c.req.path;

    // 1. Skip preflights and unauthenticated health endpoints
    if (path === '/health' || path === '/health/live' || c.req.method === 'OPTIONS') {
      return next();
    }

    // 2. Admin auth login & verify endpoints are open
    if (path === '/v1/admin/auth/login' || path === '/v1/admin/auth/verify') {
      return next();
    }

    // 3. Admin endpoints protection
    if (path.startsWith('/v1/admin')) {
      if (!strictAuth && (!expectedApiKey || expectedApiKey.trim().length === 0)) {
        // Local developer mode: allow direct access
        return next();
      }

      // Check admin token via Bearer header or x-admin-token header
      const authHeader = c.req.header('authorization');
      const xAdminToken = c.req.header('x-admin-token');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : (xAdminToken || '');

      const isMasterKey = Boolean(expectedApiKey && token === expectedApiKey);
      const isAdminToken = adminStore ? adminStore.verifyAdminToken(token) : false;

      if (!isMasterKey && !isAdminToken) {
        const errorPayload: ApiError = {
          error: {
            message: 'Admin authentication required. Provide valid setup token or master API key.',
            type: 'authentication_error',
            code: 'admin_auth_required',
            param: null,
          },
        };
        return c.json(errorPayload, 401);
      }

      return next();
    }

    // 4. Client completions, models, and usage endpoints
    if (!expectedApiKey || expectedApiKey.trim().length === 0) {
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
    const isMasterKey = token === expectedApiKey;
    const isVirtualKey = adminStore ? adminStore.isValidKey(token, expectedApiKey) : false;

    if (!isMasterKey && !isVirtualKey) {
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
