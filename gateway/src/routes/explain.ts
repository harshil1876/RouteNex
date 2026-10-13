import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import type { RoutingEngine } from '../router/engine.js';
import { type ApiError, ChatCompletionRequestSchema } from '../schemas.js';

/**
 * Creates the dry-run explain route handler for evaluating routing decisions without calling upstream providers.
 */
export function createExplainRoute(engine: RoutingEngine) {
  const router = new Hono();

  router.post('/router/explain', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      const errResponse: ApiError = {
        error: {
          message: 'Invalid JSON body provided',
          type: 'invalid_request_error',
          code: 'parse_error',
          param: null,
        },
      };
      return c.json(errResponse, 400);
    }

    const parseResult = ChatCompletionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errResponse: ApiError = {
        error: {
          message: `Request validation failed: ${parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
          type: 'invalid_request_error',
          code: 'validation_error',
          param: null,
        },
      };
      return c.json(errResponse, 400);
    }

    const requestId = `exp_${nanoid()}`;
    const explanation = engine.explain(parseResult.data, requestId);

    return c.json(explanation);
  });

  return router;
}
