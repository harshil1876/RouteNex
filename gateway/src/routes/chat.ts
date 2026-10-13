import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { nanoid } from 'nanoid';
import type { AppConfig } from '../config.js';
import type { CircuitBreaker } from '../router/circuit-breaker.js';
import type { RoutingEngine } from '../router/engine.js';
import type { RequestStore } from '../storage/sqlite.js';
import {
  type ApiError,
  ChatCompletionRequestSchema,
} from '../schemas.js';
import { ProviderError } from '../providers/types.js';
import { PromptCompressor } from '../router/compression.js';

/**
 * Creates the chat completions route handler.
 */
export function createChatRoute(
  engine: RoutingEngine,
  store: RequestStore,
  config: AppConfig
) {
  const router = new Hono();

  router.post('/chat/completions', async (c) => {
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

    const request = parseResult.data;
    const requestId = `req_${nanoid()}`;
    const startTime = Date.now();

    // Check for optional prompt compression flag
    const compressHeader = c.req.header('x-routenex-compress');
    const shouldCompress = compressHeader === 'true' || (body as any)?.compress === true;
    const effectiveRequest = shouldCompress
      ? { ...request, messages: PromptCompressor.compressMessages(request.messages).messages }
      : request;

    // Stream response
    if (effectiveRequest.stream) {
      let streamContext;
      try {
        streamContext = await engine.executeStream(effectiveRequest, requestId);
      } catch (err: any) {
        store.logRequest({
          request_id: requestId,
          timestamp: new Date().toISOString(),
          model_requested: request.model,
          model_used: request.model,
          provider: 'unknown',
          latency_ms: Date.now() - startTime,
          status: 'error',
          routing_reason: err.message,
        });

        const status = err instanceof ProviderError ? err.status : 500;
        const errPayload: ApiError = {
          error: {
            message: err.message || 'Stream initialization failed',
            type: status === 400 ? 'invalid_request_error' : 'provider_error',
            code: err.code || null,
            param: null,
          },
        };
        return c.json(errPayload, status as any);
      }

      const { generator, provider, model: modelUsed, reason, modelEntry } = streamContext;

      return streamSSE(c, async (stream) => {
        let chunkCount = 0;
        let promptTokens = 0;
        let completionTokens = 0;

        try {
          for await (const chunk of generator) {
            chunkCount++;
            if (chunk.usage) {
              promptTokens = chunk.usage.prompt_tokens;
              completionTokens = chunk.usage.completion_tokens;
            }
            await stream.writeSSE({
              data: JSON.stringify(chunk),
            });
          }

          // OpenRouter / OpenAI standard completion marker
          await stream.writeSSE({
            data: '[DONE]',
          });

          // Log success after full stream
          const latencyMs = Date.now() - startTime;
          const usage = promptTokens || completionTokens ? {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: promptTokens + completionTokens,
          } : undefined;

          store.logRequest({
            request_id: requestId,
            timestamp: new Date().toISOString(),
            model_requested: request.model,
            model_used: modelUsed,
            provider,
            latency_ms: latencyMs,
            status: 'success',
            token_usage: usage,
            cost_estimate: engine.calculateCost(modelEntry, usage),
            routing_reason: reason,
          });
        } catch (streamErr: any) {
          // Stream error after start: emit error event and close
          await stream.writeSSE({
            event: 'error',
            data: JSON.stringify({
              error: {
                message: streamErr.message || 'Error occurred during streaming',
                type: 'provider_error',
              },
            }),
          });

          store.logRequest({
            request_id: requestId,
            timestamp: new Date().toISOString(),
            model_requested: request.model,
            model_used: modelUsed,
            provider,
            latency_ms: Date.now() - startTime,
            status: 'error',
            routing_reason: `Stream error after chunk #${chunkCount}: ${streamErr.message}`,
          });
        }
      });
    }

    // Non-streaming response
    try {
      const response = await engine.executeChat(effectiveRequest, requestId);

      store.logRequest({
        request_id: requestId,
        timestamp: new Date().toISOString(),
        model_requested: request.model,
        model_used: response.routenex?.model_used || request.model,
        provider: response.routenex?.provider || 'unknown',
        latency_ms: response.routenex?.latency_ms || (Date.now() - startTime),
        status: 'success',
        token_usage: response.usage,
        cost_estimate: response.routenex?.cost_estimate,
        routing_reason: response.routenex?.routing_reason || 'Direct route',
      });

      return c.json(response);
    } catch (err: any) {
      store.logRequest({
        request_id: requestId,
        timestamp: new Date().toISOString(),
        model_requested: request.model,
        model_used: request.model,
        provider: 'unknown',
        latency_ms: Date.now() - startTime,
        status: 'error',
        routing_reason: err.message,
      });

      const status = err instanceof ProviderError ? err.status : 500;
      const errPayload: ApiError = {
        error: {
          message: err.message || 'Internal gateway error',
          type: status === 400 ? 'invalid_request_error' : 'provider_error',
          code: err.code || null,
          param: null,
        },
      };
      return c.json(errPayload, status as any);
    }
  });

  return router;
}
