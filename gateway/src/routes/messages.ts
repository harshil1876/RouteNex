/**
 * RouteNex Native Anthropic Protocol Adapter (/v1/messages)
 * 
 * Provides 100% native compatibility for:
 * - Claude Code CLI
 * - Cline (VS Code) Anthropic provider
 * - Official Anthropic TypeScript / Python SDKs (@anthropic-ai/sdk)
 * 
 * Features:
 * - Bidirectional Anthropic tools / tool_use / tool_result <-> OpenAI function tools
 * - Claude Code Discovery Aliases (claude-combo-*, claude-worker-*, claude-free-*)
 * - Automatic Free-Tier Fallback for bare claude-* / anthropic/* model requests
 * - Full JSON and SSE streaming tool call translation
 */

import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { RoutingEngine, formatCostHeader, sanitizeHeader, normalizeDiscoveryModel } from '../router/engine.js';
import type { RequestStore } from '../storage/sqlite.js';
import type { ResponseCache } from '../router/cache.js';
import type { AppConfig } from '../config.js';
import type { ChatCompletionRequest, Message } from '../schemas.js';
import { AdminStore, type VirtualKey } from '../storage/admin-store.js';
import { executeWorkerTask, WorkerBudgetExceededError } from '../workers/runtime.js';

export function createMessagesRoute(
  engine: RoutingEngine,
  store: RequestStore,
  config: AppConfig,
  cache?: ResponseCache,
  adminStore?: AdminStore
) {
  const router = new Hono();

  const handleMessages = async (c: any) => {
    const rawBody = await c.req.json().catch(() => null);
    if (!rawBody) {
      return c.json({ type: 'error', error: { type: 'invalid_request_error', message: 'Invalid JSON payload' } }, 400);
    }

    const {
      model,
      messages: rawMessages,
      system,
      max_tokens,
      temperature,
      top_p,
      stop_sequences,
      stream = false,
      tools: rawTools,
    } = rawBody;

    if (!model || !rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0) {
      return c.json(
        { type: 'error', error: { type: 'invalid_request_error', message: 'model and messages array are required' } },
        400
      );
    }

    // 0. Resolve model name & Claude Code Discovery Aliases
    let targetModel = normalizeDiscoveryModel(model);

    // Virtual Key defaultCombo & Free-tier Fallback for bare claude-* calls
    const virtualKey = (c.get as any)?.('virtualKey') as VirtualKey | undefined;
    const anthropicConfigured = Boolean(
      (adminStore && adminStore.getProviderKey('anthropic')) ||
      process.env.ANTHROPIC_API_KEY
    );

    if (
      (targetModel.startsWith('claude-') || targetModel.startsWith('anthropic/')) &&
      (!anthropicConfigured || virtualKey?.defaultCombo)
    ) {
      targetModel = virtualKey?.defaultCombo || 'combo/free-unlimited';
    }

    if (targetModel === 'auto' && virtualKey?.defaultCombo) {
      targetModel = virtualKey.defaultCombo;
    }

    // Enforce Virtual Key allowedModels restriction if configured
    if (virtualKey?.allowedModels && virtualKey.allowedModels.length > 0) {
      const allowed = virtualKey.allowedModels.some((pattern: string) => {
        if (pattern === '*' || pattern === model || pattern === targetModel) return true;
        if (pattern.endsWith('*') && (model.startsWith(pattern.slice(0, -1)) || targetModel.startsWith(pattern.slice(0, -1)))) return true;
        return false;
      });
      if (!allowed) {
        return c.json({
          type: 'error',
          error: {
            type: 'permission_error',
            message: `Model '${model}' is not permitted for this API key. Allowed models: ${virtualKey.allowedModels.join(', ')}`,
          },
        }, 403);
      }
    }

    // 1. Translate Anthropic tools to OpenAI functions format
    let openAiTools: any[] | undefined = undefined;
    if (Array.isArray(rawTools) && rawTools.length > 0) {
      openAiTools = rawTools.map((t: any) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description || '',
          parameters: t.input_schema || { type: 'object', properties: {} },
        },
      }));
    }

    // 2. Translate Anthropic messages to standard OpenAI format (handling tool_use & tool_result)
    const normalizedMessages: Message[] = [];

    // Inject system message if provided
    if (system) {
      const systemContent = typeof system === 'string'
        ? system
        : Array.isArray(system)
        ? system.map((s: any) => s.text || '').join('\n')
        : String(system);
      if (systemContent.trim()) {
        normalizedMessages.push({ role: 'system', content: systemContent });
      }
    }

    // Map conversation turns
    for (const msg of rawMessages) {
      if (typeof msg.content === 'string') {
        normalizedMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
        continue;
      }

      if (Array.isArray(msg.content)) {
        if (msg.role === 'assistant') {
          const textBlocks: string[] = [];
          const toolCalls: any[] = [];
          for (const block of msg.content) {
            if (block.type === 'text') {
              textBlocks.push(block.text || '');
            } else if (block.type === 'tool_use') {
              toolCalls.push({
                id: block.id,
                type: 'function',
                function: {
                  name: block.name,
                  arguments: typeof block.input === 'string' ? block.input : JSON.stringify(block.input || {}),
                },
              });
            }
          }
          normalizedMessages.push({
            role: 'assistant',
            content: textBlocks.join('\n') || (toolCalls.length > 0 ? null : ''),
            ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
          } as any);
        } else {
          // User turn: could contain text or tool_result
          const hasToolResult = msg.content.some((b: any) => b.type === 'tool_result');
          if (hasToolResult) {
            for (const block of msg.content) {
              if (block.type === 'tool_result') {
                const resContent = typeof block.content === 'string'
                  ? block.content
                  : Array.isArray(block.content)
                  ? block.content.map((b: any) => b.text || JSON.stringify(b)).join('\n')
                  : JSON.stringify(block.content || '');
                normalizedMessages.push({
                  role: 'tool',
                  tool_call_id: block.tool_use_id,
                  content: resContent,
                } as any);
              } else if (block.type === 'text' && block.text?.trim()) {
                normalizedMessages.push({ role: 'user', content: block.text });
              }
            }
          } else {
            const text = msg.content
              .map((b: any) => (b.type === 'text' ? b.text : ''))
              .filter(Boolean)
              .join('\n');
            normalizedMessages.push({ role: 'user', content: text });
          }
        }
      } else {
        normalizedMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: String(msg.content ?? ''),
        });
      }
    }

    const sessionId = c.req.header('x-session-id') || rawBody.sessionId || rawBody.session_id;

    const chatRequest: ChatCompletionRequest = {
      model: targetModel,
      messages: normalizedMessages,
      max_tokens: typeof max_tokens === 'number' ? max_tokens : undefined,
      temperature: typeof temperature === 'number' ? temperature : undefined,
      top_p: typeof top_p === 'number' ? top_p : undefined,
      stop: stop_sequences,
      stream: Boolean(stream),
      n: 1,
      ...(openAiTools ? { tools: openAiTools } : {}),
    };

    if (sessionId) {
      (chatRequest as any).sessionId = sessionId;
    }
    if (virtualKey?.defaultCombo) {
      (chatRequest as any).defaultCombo = virtualKey.defaultCombo;
    }

    const requestId = `msg_${nanoid(20)}`;

    // Virtual Model Ingress: model: "worker/<slug>" (Anthropic Protocol)
    if (targetModel.startsWith('worker/')) {
      const workerSlug = targetModel.replace(/^worker\//, '').trim();
      let prompt: string;
      if (normalizedMessages.length > 1) {
        prompt = normalizedMessages
          .map((m) => `${m.role ? m.role.toUpperCase() + ': ' : ''}${typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '')}`)
          .join('\n\n');
      } else {
        const lastMsg = normalizedMessages[0];
        prompt = typeof lastMsg?.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg?.content || '');
      }

      const startTime = Date.now();
      try {
        const storeToUse = adminStore || (engine as any).adminStore || new AdminStore('./routenex_admin.json', true);
        const run = await executeWorkerTask(workerSlug, { prompt, triggerType: 'api_chat' }, storeToUse, engine);

        c.header('X-RouteNex-Request-Id', sanitizeHeader(requestId));
        c.header('X-RouteNex-Worker-Id', sanitizeHeader(run.workerId));
        c.header('X-RouteNex-Worker-Status', sanitizeHeader(run.status));
        c.header('X-RouteNex-Tokens-Saved', String(run.totalTokensSaved || 0));
        c.header('X-RouteNex-Selected-Provider', 'nexworker');
        c.header('X-RouteNex-Selected-Model', sanitizeHeader(targetModel));

        const responseContent =
          run.status === 'awaiting_approval'
            ? `[ACTION SHIELD PAUSED] Action requires human approval. Run ID: ${run.id}. Awaiting operator review in RouteNex Studio.`
            : run.finalResponse || `Task completed by worker/${run.workerSlug}. Output brief generated: ${run.outputBriefId || 'none'}.`;

        const usage = {
          input_tokens: Math.max(10, Math.ceil(prompt.length / 4)),
          output_tokens: Math.max(10, Math.ceil(responseContent.length / 4)),
        };

        store.logRequest({
          request_id: requestId,
          timestamp: new Date().toISOString(),
          model_requested: model,
          model_used: targetModel,
          provider: 'nexworker',
          latency_ms: Date.now() - startTime,
          status: run.status === 'denied' ? 'error' : 'success',
          token_usage: { prompt_tokens: usage.input_tokens, completion_tokens: usage.output_tokens, total_tokens: usage.input_tokens + usage.output_tokens },
          cost_estimate: { total_usd: run.totalCostUsd, provenance: 'ESTIMATED', price_timestamp: null },
          routing_reason: `Autonomous worker/${workerSlug} execution (${run.status})`,
        });

        if (stream) {
          const encoder = new TextEncoder();
          const streamResponse = new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode(
                  `event: message_start\ndata: ${JSON.stringify({
                    type: 'message_start',
                    message: {
                      id: requestId,
                      type: 'message',
                      role: 'assistant',
                      content: [],
                      model: targetModel,
                      stop_reason: null,
                      stop_sequence: null,
                      usage: { input_tokens: usage.input_tokens, output_tokens: 1 },
                    },
                  })}\n\n`
                )
              );

              controller.enqueue(
                encoder.encode(
                  `event: content_block_start\ndata: ${JSON.stringify({
                    type: 'content_block_start',
                    index: 0,
                    content_block: { type: 'text', text: '' },
                  })}\n\n`
                )
              );

              controller.enqueue(
                encoder.encode(
                  `event: content_block_delta\ndata: ${JSON.stringify({
                    type: 'content_block_delta',
                    index: 0,
                    delta: { type: 'text_delta', text: responseContent },
                  })}\n\n`
                )
              );

              controller.enqueue(
                encoder.encode(`event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`)
              );

              controller.enqueue(
                encoder.encode(
                  `event: message_delta\ndata: ${JSON.stringify({
                    type: 'message_delta',
                    delta: { stop_reason: 'end_turn', stop_sequence: null },
                    usage: { output_tokens: usage.output_tokens },
                  })}\n\n`
                )
              );

              controller.enqueue(encoder.encode(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`));
              controller.close();
            },
          });

          return new Response(streamResponse, {
            headers: {
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'X-RouteNex-Request-Id': sanitizeHeader(requestId),
              'X-RouteNex-Worker-Id': sanitizeHeader(run.workerId),
              'X-RouteNex-Worker-Status': sanitizeHeader(run.status),
              'X-RouteNex-Tokens-Saved': String(run.totalTokensSaved || 0),
            },
          });
        }

        return c.json({
          id: requestId,
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: responseContent,
            },
          ],
          model: targetModel,
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage,
        });
      } catch (err: any) {
        if (err instanceof WorkerBudgetExceededError || err?.code === 'worker_budget_exceeded') {
          return c.json({ type: 'error', error: { type: 'rate_limit_error', message: err.message } }, 429);
        }
        return c.json({ type: 'error', error: { type: 'api_error', message: err.message || 'Worker execution failed' } }, 500);
      }
    }

    // 3. Non-streaming Execution
    if (!stream) {
      try {
        const response = await engine.executeChat(chatRequest, requestId);

        // Convert upstream choice to Anthropic format (supporting tool_use)
        const choice = response.choices[0];
        const msg = choice?.message;
        const contentBlocks: any[] = [];

        if (msg?.content) {
          contentBlocks.push({
            type: 'text',
            text: msg.content,
          });
        }

        const toolCalls = msg?.tool_calls;
        if (Array.isArray(toolCalls) && toolCalls.length > 0) {
          for (const tc of toolCalls) {
            let parsedInput = {};
            try {
              parsedInput = typeof tc.function?.arguments === 'string'
                ? JSON.parse(tc.function.arguments)
                : (tc.function?.arguments || {});
            } catch {
              parsedInput = { raw: tc.function?.arguments || '' };
            }
            contentBlocks.push({
              type: 'tool_use',
              id: tc.id || `toolu_${nanoid(16)}`,
              name: tc.function?.name || 'tool',
              input: parsedInput,
            });
          }
        }

        if (contentBlocks.length === 0) {
          contentBlocks.push({ type: 'text', text: '' });
        }

        const stopReason = (Array.isArray(toolCalls) && toolCalls.length > 0)
          ? 'tool_use'
          : choice?.finish_reason === 'stop'
          ? 'end_turn'
          : 'max_tokens';

        const anthropicResponse = {
          id: requestId,
          type: 'message',
          role: 'assistant',
          model: response.model,
          content: contentBlocks,
          stop_reason: stopReason,
          stop_sequence: null,
          usage: {
            input_tokens: response.usage?.prompt_tokens ?? 0,
            output_tokens: response.usage?.completion_tokens ?? 0,
          },
          routenex: response.routenex,
        };

        // Cache response if enabled
        if (cache && !response.routenex?.cache_hit) {
          cache.set(chatRequest, response);
        }

        const costUsd = response.routenex?.cost_estimate?.total_usd;
        if (virtualKey?.id && typeof costUsd === 'number' && adminStore) {
          adminStore.recordKeySpend(virtualKey.id, costUsd);
        }

        c.header('X-RouteNex-Request-Id', sanitizeHeader(requestId));
        c.header('X-RouteNex-Selected-Provider', sanitizeHeader(response.routenex?.provider || 'unknown'));
        c.header('X-RouteNex-Selected-Model', sanitizeHeader(response.routenex?.model_used || targetModel));
        c.header('X-RouteNex-Decision-Reason', sanitizeHeader(response.routenex?.routing_reason || 'Direct route'));
        c.header('X-RouteNex-Fallback-Count', String(response.routenex?.fallback_attempts ?? 0));
        c.header('X-RouteNex-Tokens-Saved', '0');
        c.header('X-RouteNex-Estimated-Cost-USD', formatCostHeader(response.routenex?.cost_estimate));

        return c.json(anthropicResponse);
      } catch (err: any) {
        return c.json(
          {
            type: 'error',
            error: {
              type: 'api_error',
              message: err.message || 'Routing failed',
            },
          },
          err.status || 500
        );
      }
    }

    // 4. Streaming Execution (Anthropic SSE Protocol with Tool Calling Support)
    let streamContext;
    try {
      streamContext = await engine.executeStream(chatRequest, requestId, c.req.raw?.signal);
    } catch (err: any) {
      return c.json(
        {
          type: 'error',
          error: {
            type: 'api_error',
            message: err.message || 'Routing failed',
          },
        },
        err.status || 500
      );
    }

    const { generator, provider, model: modelUsed, reason, modelEntry } = streamContext;
    const encoder = new TextEncoder();
    let aborted = false;

    if (c.req.raw?.signal) {
      c.req.raw.signal.addEventListener('abort', () => {
        aborted = true;
        generator.return?.(undefined as any).catch(() => {});
      }, { once: true });
    }

    const streamResponse = new ReadableStream({
      async cancel() {
        aborted = true;
        try {
          await generator.return?.(undefined as any);
        } catch {}
      },
      async start(controller) {
        // Event 1: message_start
        controller.enqueue(
          encoder.encode(
            `event: message_start\ndata: ${JSON.stringify({
              type: 'message_start',
              message: {
                id: requestId,
                type: 'message',
                role: 'assistant',
                content: [],
                model: modelUsed,
                stop_reason: null,
                stop_sequence: null,
                usage: { input_tokens: 15, output_tokens: 1 },
              },
            })}\n\n`
          )
        );

        let blockIndex = 0;
        let textBlockStarted = false;
        let activeToolCallIndex: number | null = null;
        let hasToolCalls = false;
        let outputTokens = 0;

        try {
          for await (const chunk of generator) {
            const delta = chunk.choices[0]?.delta;
            const token = delta?.content;

            if (token) {
              outputTokens++;
              if (!textBlockStarted) {
                controller.enqueue(
                  encoder.encode(
                    `event: content_block_start\ndata: ${JSON.stringify({
                      type: 'content_block_start',
                      index: blockIndex,
                      content_block: { type: 'text', text: '' },
                    })}\n\n`
                  )
                );
                textBlockStarted = true;
              }
              controller.enqueue(
                encoder.encode(
                  `event: content_block_delta\ndata: ${JSON.stringify({
                    type: 'content_block_delta',
                    index: blockIndex,
                    delta: { type: 'text_delta', text: token },
                  })}\n\n`
                )
              );
            }

            if (delta?.tool_calls && Array.isArray(delta.tool_calls)) {
              hasToolCalls = true;
              for (const tc of delta.tool_calls) {
                if (textBlockStarted) {
                  controller.enqueue(
                    encoder.encode(`event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: blockIndex })}\n\n`)
                  );
                  textBlockStarted = false;
                  blockIndex++;
                }

                if (tc.id || tc.function?.name) {
                  if (activeToolCallIndex !== null) {
                    controller.enqueue(
                      encoder.encode(`event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: blockIndex })}\n\n`)
                    );
                    blockIndex++;
                  }
                  activeToolCallIndex = blockIndex;
                  controller.enqueue(
                    encoder.encode(
                      `event: content_block_start\ndata: ${JSON.stringify({
                        type: 'content_block_start',
                        index: blockIndex,
                        content_block: {
                          type: 'tool_use',
                          id: tc.id || `toolu_${nanoid(16)}`,
                          name: tc.function?.name || 'unknown_tool',
                          input: {},
                        },
                      })}\n\n`
                    )
                  );
                }

                if (tc.function?.arguments) {
                  outputTokens++;
                  controller.enqueue(
                    encoder.encode(
                      `event: content_block_delta\ndata: ${JSON.stringify({
                        type: 'content_block_delta',
                        index: blockIndex,
                        delta: {
                          type: 'input_json_delta',
                          partial_json: tc.function.arguments,
                        },
                      })}\n\n`
                    )
                  );
                }
              }
            }
          }
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({
                type: 'error',
                error: { type: 'api_error', message: err.message || 'Streaming failed' },
              })}\n\n`
            )
          );
        }

        // Close any active blocks
        if (textBlockStarted || activeToolCallIndex !== null) {
          controller.enqueue(
            encoder.encode(`event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: blockIndex })}\n\n`)
          );
        }

        const stopReason = hasToolCalls ? 'tool_use' : 'end_turn';

        // Event 4: message_delta
        controller.enqueue(
          encoder.encode(
            `event: message_delta\ndata: ${JSON.stringify({
              type: 'message_delta',
              delta: { stop_reason: stopReason, stop_sequence: null },
              usage: { output_tokens: Math.max(1, outputTokens) },
            })}\n\n`
          )
        );

        // Event 5: message_stop
        controller.enqueue(encoder.encode(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`));

        // Record virtual key spend for completed stream
        const streamCost = engine.calculateCost(modelEntry, { prompt_tokens: 15, completion_tokens: Math.max(1, outputTokens), total_tokens: 15 + Math.max(1, outputTokens) });
        if (virtualKey?.id && typeof streamCost?.total_usd === 'number' && adminStore) {
          adminStore.recordKeySpend(virtualKey.id, streamCost.total_usd);
        }

        controller.close();
      },
    });

    return new Response(streamResponse, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-RouteNex-Request-Id': sanitizeHeader(requestId),
        'X-RouteNex-Selected-Provider': sanitizeHeader(provider),
        'X-RouteNex-Selected-Model': sanitizeHeader(modelUsed),
        'X-RouteNex-Decision-Reason': sanitizeHeader(reason),
        'X-RouteNex-Fallback-Count': '0',
        'X-RouteNex-Tokens-Saved': '0',
        'X-RouteNex-Estimated-Cost-USD': formatCostHeader(engine.calculateCost(modelEntry, undefined)),
      },
    });
  };

  router.post('/messages', handleMessages);
  router.post('/v1/messages', handleMessages);

  return router;
}
