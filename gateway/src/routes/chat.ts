import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { nanoid } from 'nanoid';
import type { AppConfig } from '../config.js';
import type { CircuitBreaker } from '../router/circuit-breaker.js';
import { RoutingEngine, formatCostHeader, sanitizeHeader } from '../router/engine.js';
import type { RequestStore } from '../storage/sqlite.js';
import {
  type ApiError,
  ChatCompletionRequestSchema,
} from '../schemas.js';
import { ProviderError } from '../providers/types.js';
import { PromptCompressor } from '../router/compression.js';
import type { ResponseCache } from '../router/cache.js';
import { executeWorkerTask, WorkerBudgetExceededError } from '../workers/runtime.js';
import { AdminStore } from '../storage/admin-store.js';

/**
 * Creates the chat completions route handler.
 */
export function createChatRoute(
  engine: RoutingEngine,
  store: RequestStore,
  config: AppConfig,
  cache?: ResponseCache,
  adminStore?: AdminStore
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

    // Virtual Model Ingress: model: "worker/<slug>"
    if (request.model.startsWith('worker/')) {
      const workerSlug = request.model.replace(/^worker\//, '').trim();
      const lastMsg = request.messages[request.messages.length - 1];
      const prompt = typeof lastMsg?.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg?.content || '');

      try {
        const storeToUse = adminStore || (engine as any).adminStore || new AdminStore('./routenex_admin.json', true);
        const run = await executeWorkerTask(workerSlug, { prompt, triggerType: 'api_chat' }, storeToUse, engine);

        c.header('X-RouteNex-Request-Id', sanitizeHeader(requestId));
        c.header('X-RouteNex-Worker-Id', sanitizeHeader(run.workerId));
        c.header('X-RouteNex-Worker-Status', sanitizeHeader(run.status));
        c.header('X-RouteNex-Tokens-Saved', String(run.totalTokensSaved || 0));
        c.header('X-RouteNex-Selected-Provider', 'nexworker');
        c.header('X-RouteNex-Selected-Model', sanitizeHeader(request.model));

        const responseContent =
          run.status === 'awaiting_approval'
            ? `[ACTION SHIELD PAUSED] Action requires human approval. Run ID: ${run.id}. Awaiting operator review in RouteNex Studio.`
            : run.finalResponse || `Task completed by worker/${run.workerSlug}. Output brief generated: ${run.outputBriefId || 'none'}.`;

        const usage = {
          prompt_tokens: Math.max(10, Math.ceil(prompt.length / 4)),
          completion_tokens: Math.max(10, Math.ceil(responseContent.length / 4)),
          total_tokens: Math.max(20, Math.ceil((prompt.length + responseContent.length) / 4)),
        };

        store.logRequest({
          request_id: requestId,
          timestamp: new Date().toISOString(),
          model_requested: request.model,
          model_used: request.model,
          provider: 'nexworker',
          latency_ms: Date.now() - startTime,
          status: run.status === 'denied' ? 'error' : 'success',
          token_usage: usage,
          cost_estimate: { total_usd: run.totalCostUsd, provenance: 'ESTIMATED', price_timestamp: null },
          routing_reason: `Autonomous worker/${workerSlug} execution (${run.status})`,
        });

        return c.json({
          id: `chatcmpl_worker_${run.id}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: request.model,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: responseContent,
              },
              finish_reason: 'stop',
            },
          ],
          usage,
        });
      } catch (err: any) {
        if (err instanceof WorkerBudgetExceededError || err?.code === 'worker_budget_exceeded') {
          return c.json(
            {
              error: {
                message: err.message,
                code: 'worker_budget_exceeded',
                type: 'rate_limit_error',
              },
            },
            429
          );
        }
        return c.json(
          {
            error: {
              message: err.message || 'Worker execution failed',
              type: 'worker_error',
              code: 'WORKER_ERROR',
            },
          },
          500
        );
      }
    }


    // Check for optional prompt compression flag
    const compressHeader = c.req.header('x-routenex-compress');
    const shouldCompress = compressHeader === 'true' || (body as any)?.compress === true;
    let compressionStats: any = undefined;
    let effectiveRequest = request;

    if (shouldCompress) {
      const compResult = PromptCompressor.compressMessages(request.messages);
      effectiveRequest = { ...request, messages: compResult.messages };
      compressionStats = {
        original_chars: compResult.originalChars,
        compressed_chars: compResult.compressedChars,
        saved_percent: compResult.savedPercent,
        estimated_tokens_saved: compResult.estimatedTokensSaved,
      };
    }

    // Fast-path: Check response cache for identical prompt
    const skipCache = c.req.header('x-routenex-cache') === 'false';
    if (!effectiveRequest.stream && cache && !skipCache) {
      const cached = cache.get(effectiveRequest);
      if (cached) {
        if (compressionStats && cached.routenex) {
          cached.routenex.compression = compressionStats;
        }
        store.logRequest({
          request_id: requestId,
          timestamp: new Date().toISOString(),
          model_requested: request.model,
          model_used: cached.routenex?.model_used || request.model,
          provider: cached.routenex?.provider || 'cache',
          latency_ms: 0,
          status: 'success',
          token_usage: cached.usage,
          cost_estimate: cached.routenex?.cost_estimate,
          routing_reason: cached.routenex?.routing_reason || 'Local cache hit',
        });

        c.header('X-RouteNex-Request-Id', sanitizeHeader(requestId));
        c.header('X-RouteNex-Selected-Provider', sanitizeHeader(cached.routenex?.provider || 'cache'));
        c.header('X-RouteNex-Selected-Model', sanitizeHeader(cached.routenex?.model_used || request.model));
        c.header('X-RouteNex-Decision-Reason', sanitizeHeader(cached.routenex?.routing_reason || 'Local cache hit'));
        c.header('X-RouteNex-Fallback-Count', '0');
        c.header('X-RouteNex-Tokens-Saved', String(compressionStats?.estimated_tokens_saved ?? 0));
        c.header('X-RouteNex-Estimated-Cost-USD', formatCostHeader(cached.routenex?.cost_estimate));

        return c.json(cached);
      }
    }

    // Stream response
    if (effectiveRequest.stream) {
      let streamContext;
      try {
        streamContext = await engine.executeStream(effectiveRequest, requestId, c.req.raw?.signal);
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

      c.header('X-RouteNex-Request-Id', sanitizeHeader(requestId));
      c.header('X-RouteNex-Selected-Provider', sanitizeHeader(provider));
      c.header('X-RouteNex-Provider-Used', sanitizeHeader(provider));
      c.header('X-RouteNex-Selected-Model', sanitizeHeader(modelUsed));
      c.header('X-RouteNex-Decision-Reason', sanitizeHeader(reason));
      c.header('X-RouteNex-Fallback-Count', '0');
      c.header('X-RouteNex-Tokens-Saved', String(compressionStats?.estimated_tokens_saved ?? 0));
      c.header('X-RouteNex-Estimated-Cost-USD', formatCostHeader(engine.calculateCost(modelEntry, undefined)));

      return streamSSE(c, async (stream) => {
        let chunkCount = 0;
        let promptTokens = 0;
        let completionTokens = 0;

        stream.onAbort(() => {
          generator.return?.(undefined as any).catch(() => {});
        });

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

    try {
      const response = await engine.executeChat(effectiveRequest, requestId);

      if (response.routenex && compressionStats) {
        response.routenex.compression = compressionStats;
      }

      if (cache && !skipCache && response) {
        cache.set(effectiveRequest, response);
      }

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

      c.header('X-RouteNex-Request-Id', sanitizeHeader(requestId));
      c.header('X-RouteNex-Selected-Provider', sanitizeHeader(response.routenex?.provider || 'unknown'));
      c.header('X-RouteNex-Provider-Used', sanitizeHeader(response.routenex?.provider || 'unknown'));
      c.header('X-RouteNex-Selected-Model', sanitizeHeader(response.routenex?.model_used || request.model));
      c.header('X-RouteNex-Decision-Reason', sanitizeHeader(response.routenex?.routing_reason || 'Direct route'));
      c.header('X-RouteNex-Fallback-Count', String(response.routenex?.fallback_attempts ?? 0));
      c.header('X-RouteNex-Tokens-Saved', String(compressionStats?.estimated_tokens_saved ?? 0));
      c.header('X-RouteNex-Estimated-Cost-USD', formatCostHeader(response.routenex?.cost_estimate));

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
