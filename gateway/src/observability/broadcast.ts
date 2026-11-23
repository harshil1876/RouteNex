/**
 * RouteNex Observability Broadcast Exporter (OpenTelemetry OTLP, Langfuse, & Signed Webhooks)
 *
 * Streams generation telemetry and nested NexWorker + Action Shield spans to external
 * observability backends without modifying application code.
 *
 * Privacy-First Default:
 *   `logBodies` is strictly FALSE by default — prompt and completion bodies are NEVER
 *   exported unless explicitly opted in by an organization admin.
 */

import crypto from 'node:crypto';
import { validateSafeUrl } from '../utils/security.js';

export interface BroadcastConfig {
  enabled: boolean;
  otlpEndpoint?: string;
  otlpHeaders?: Record<string, string>;
  langfuseBaseUrl?: string;
  langfusePublicKey?: string;
  langfuseSecretKey?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  logBodies: boolean;
}

export interface BroadcastGenerationEvent {
  requestId: string;
  timestamp: string;
  modelRequested: string;
  modelUsed: string;
  provider: string;
  latencyMs: number;
  status: 'success' | 'error';
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number | null;
  routingReason?: string;
  orgId?: string;
  workerRunId?: string;
  actionShieldDecision?: string;
  promptPreview?: string;
  completionPreview?: string;
}

let activeConfig: BroadcastConfig = {
  enabled: Boolean(
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    (process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY) ||
    process.env.ROUTENEX_BROADCAST_WEBHOOK_URL
  ),
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  langfuseBaseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
  langfusePublicKey: process.env.LANGFUSE_PUBLIC_KEY,
  langfuseSecretKey: process.env.LANGFUSE_SECRET_KEY,
  webhookUrl: process.env.ROUTENEX_BROADCAST_WEBHOOK_URL,
  webhookSecret: process.env.ROUTENEX_BROADCAST_WEBHOOK_SECRET,
  logBodies: process.env.ROUTENEX_BROADCAST_LOG_BODIES === 'true',
};

export function getBroadcastConfig(): Omit<BroadcastConfig, 'langfuseSecretKey' | 'webhookSecret'> & {
  hasLangfuseSecret: boolean;
  hasWebhookSecret: boolean;
} {
  return {
    enabled: activeConfig.enabled,
    otlpEndpoint: activeConfig.otlpEndpoint,
    otlpHeaders: activeConfig.otlpHeaders,
    langfuseBaseUrl: activeConfig.langfuseBaseUrl,
    langfusePublicKey: activeConfig.langfusePublicKey,
    webhookUrl: activeConfig.webhookUrl,
    logBodies: activeConfig.logBodies,
    hasLangfuseSecret: Boolean(activeConfig.langfuseSecretKey),
    hasWebhookSecret: Boolean(activeConfig.webhookSecret),
  };
}

export function updateBroadcastConfig(patch: Partial<BroadcastConfig>): { ok: boolean; error?: string } {
  // SSRF-validate any configured external URLs
  for (const [label, url] of [
    ['otlpEndpoint', patch.otlpEndpoint],
    ['langfuseBaseUrl', patch.langfuseBaseUrl],
    ['webhookUrl', patch.webhookUrl],
  ] as const) {
    if (url && typeof url === 'string' && url.trim().length > 0) {
      const check = validateSafeUrl(url.trim(), false);
      if (!check.safe) {
        return { ok: false, error: `Unsafe ${label}: ${check.reason}` };
      }
    }
  }

  activeConfig = {
    ...activeConfig,
    ...patch,
  };
  return { ok: true };
}

/**
 * Builds a privacy-compliant broadcast payload (strips prompt/completion bodies unless logBodies=true).
 */
export function buildSafeBroadcastPayload(event: BroadcastGenerationEvent): Record<string, unknown> {
  const base: Record<string, unknown> = {
    request_id: event.requestId,
    timestamp: event.timestamp,
    model_requested: event.modelRequested,
    model_used: event.modelUsed,
    provider: event.provider,
    latency_ms: event.latencyMs,
    status: event.status,
    usage: {
      prompt_tokens: event.promptTokens ?? 0,
      completion_tokens: event.completionTokens ?? 0,
      total_tokens: event.totalTokens ?? 0,
    },
    cost_usd: event.costUsd ?? null,
    routing_reason: event.routingReason || 'auto',
    org_id: event.orgId || 'default',
    ...(event.workerRunId ? { worker_run_id: event.workerRunId } : {}),
    ...(event.actionShieldDecision ? { action_shield_decision: event.actionShieldDecision } : {}),
  };

  if (activeConfig.logBodies) {
    if (event.promptPreview) base.prompt_preview = event.promptPreview;
    if (event.completionPreview) base.completion_preview = event.completionPreview;
  }

  return base;
}

/**
 * Signs a JSON payload with HMAC-SHA256 for verifiable webhook delivery.
 */
export function signBroadcastPayload(payloadJson: string, secret: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(payloadJson).digest('hex')}`;
}

/**
 * Non-blocking fire-and-forget dispatch to configured OTLP, Langfuse, and Webhook sinks.
 */
export async function emitBroadcastEvent(event: BroadcastGenerationEvent): Promise<void> {
  if (!activeConfig.enabled) return;

  const payload = buildSafeBroadcastPayload(event);
  const bodyJson = JSON.stringify(payload);
  const dispatches: Promise<unknown>[] = [];

  // 1. OpenTelemetry OTLP JSON Span
  if (activeConfig.otlpEndpoint) {
    const startNano = String(BigInt(Date.now() - Math.max(1, event.latencyMs)) * 1_000_000n);
    const endNano = String(BigInt(Date.now()) * 1_000_000n);
    const otlpBody = {
      resourceSpans: [
        {
          resource: {
            attributes: [{ key: 'service.name', value: { stringValue: 'routenex-gateway' } }],
          },
          scopeSpans: [
            {
              spans: [
                {
                  traceId: crypto.createHash('sha256').update(event.workerRunId || event.requestId).digest('hex').slice(0, 32),
                  spanId: crypto.createHash('sha256').update(event.requestId).digest('hex').slice(0, 16),
                  name: event.workerRunId ? 'routenex.nexworker.generation' : 'routenex.llm.generation',
                  startTimeUnixNano: startNano,
                  endTimeUnixNano: endNano,
                  attributes: [
                    { key: 'gen_ai.system', value: { stringValue: event.provider } },
                    { key: 'gen_ai.request.model', value: { stringValue: event.modelRequested } },
                    { key: 'gen_ai.response.model', value: { stringValue: event.modelUsed } },
                    { key: 'gen_ai.usage.input_tokens', value: { intValue: event.promptTokens ?? 0 } },
                    { key: 'gen_ai.usage.output_tokens', value: { intValue: event.completionTokens ?? 0 } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    dispatches.push(
      fetch(activeConfig.otlpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeConfig.otlpHeaders || {}),
        },
        body: JSON.stringify(otlpBody),
        signal: AbortSignal.timeout(4000),
      }).catch(() => {})
    );
  }

  // 2. Langfuse Ingestion API
  if (activeConfig.langfuseBaseUrl && activeConfig.langfusePublicKey && activeConfig.langfuseSecretKey) {
    const auth = Buffer.from(`${activeConfig.langfusePublicKey}:${activeConfig.langfuseSecretKey}`).toString('base64');
    const langfuseUrl = `${activeConfig.langfuseBaseUrl.replace(/\/+$/, '')}/api/public/ingestion`;
    dispatches.push(
      fetch(langfuseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          batch: [
            {
              id: event.requestId,
              type: 'generation-create',
              timestamp: event.timestamp,
              body: payload,
            },
          ],
        }),
        signal: AbortSignal.timeout(4000),
      }).catch(() => {})
    );
  }

  // 3. Signed Custom Webhook
  if (activeConfig.webhookUrl) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeConfig.webhookSecret) {
      headers['X-RouteNex-Signature'] = signBroadcastPayload(bodyJson, activeConfig.webhookSecret);
    }
    dispatches.push(
      fetch(activeConfig.webhookUrl, {
        method: 'POST',
        headers,
        body: bodyJson,
        signal: AbortSignal.timeout(4000),
      }).catch(() => {})
    );
  }

  await Promise.allSettled(dispatches);
}
