/**
 * RouteNex Action Shield: Policy Evaluator & Guard
 * 
 * Audits worker tool execution against human-defined plain-English safety rules,
 * enforces read/write/critical risk tiers, scrubs secret parameters, and pauses
 * dangerous executions for interactive Human-in-the-Loop approval.
 */

import type { NexWorker, ActionShieldDecision, WorkerTool, WorkerRiskTier } from './types.js';

const SENSITIVE_KEY_REGEX = /(key|token|secret|password|auth|bearer|credential|cert)/i;

/**
 * Recursively scrubs credentials or sensitive tokens from tool payload arguments before logging or storing.
 */
export function scrubSensitiveArgs(args: Record<string, unknown>): Record<string, unknown> {
  if (!args || typeof args !== 'object') return {};

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      clean[key] = '[REDACTED_CREDENTIAL]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      clean[key] = scrubSensitiveArgs(value as Record<string, unknown>);
    } else if (typeof value === 'string' && value.length > 2000) {
      // Truncate giant payloads to prevent log bloat
      clean[key] = `${value.slice(0, 1000)}... [Truncated ${value.length - 1000} chars]`;
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Finds matching safety rule for a tool action based on action semantics.
 */
function findMatchingSafetyRule(rules: string[], toolName: string, riskTier: WorkerRiskTier): string {
  const normalizedTool = toolName.toLowerCase();

  for (const rule of rules) {
    const lower = rule.toLowerCase();
    if (normalizedTool.includes('merge') && (lower.includes('merge') || lower.includes('pr'))) {
      return rule;
    }
    if ((normalizedTool.includes('review') || normalizedTool.includes('comment')) && (lower.includes('review') || lower.includes('comment') || lower.includes('post'))) {
      return rule;
    }
    if ((normalizedTool.includes('slack') || normalizedTool.includes('email') || normalizedTool.includes('message')) && (lower.includes('slack') || lower.includes('email') || lower.includes('broadcast') || lower.includes('message'))) {
      return rule;
    }
    if ((normalizedTool.includes('update') || normalizedTool.includes('combo') || normalizedTool.includes('config')) && (lower.includes('update') || lower.includes('combo') || lower.includes('weight') || lower.includes('production'))) {
      return rule;
    }
    if ((normalizedTool.includes('release') || normalizedTool.includes('publish') || normalizedTool.includes('tag')) && (lower.includes('release') || lower.includes('publish') || lower.includes('tag'))) {
      return rule;
    }
    if (riskTier === 'critical' && (lower.includes('never') || lower.includes('approval') || lower.includes('always ask'))) {
      return rule;
    }
  }

  // Fallback to first rule or default guideline
  return rules[0] || 'Ask before executing mutating write or critical tools.';
}

/**
 * Evaluates whether a worker's proposed tool action should be allowed, paused for approval, or denied.
 */
export async function evaluateToolAction(
  worker: NexWorker,
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<ActionShieldDecision> {
  const startTime = Date.now();
  const normalizedTool = toolName.toLowerCase().trim();

  // 1. Locate tool definition on worker, or deduce from name
  let tool = worker.tools.find((t) => t.name.toLowerCase() === normalizedTool);
  if (!tool) {
    // Deduce risk tier from naming convention
    const isCritical = normalizedTool.includes('merge') || normalizedTool.includes('delete') || normalizedTool.includes('drop') || normalizedTool.includes('release') || normalizedTool.includes('publish');
    const isWrite = isCritical || normalizedTool.includes('post') || normalizedTool.includes('write') || normalizedTool.includes('update') || normalizedTool.includes('send') || normalizedTool.includes('create');
    tool = {
      id: `tool_${normalizedTool.replace(/[^a-z0-9_]/g, '_')}`,
      name: toolName,
      category: 'mcp',
      riskTier: isCritical ? 'critical' : isWrite ? 'write' : 'read',
      permission: isWrite || isCritical ? 'ask' : 'auto',
    };
  }

  // 2. Explicit Deny
  if (tool.permission === 'deny') {
    return {
      decision: 'deny',
      reason: `Tool '${toolName}' is explicitly blocked by worker policy.`,
      latencyMs: Math.max(1, Date.now() - startTime),
    };
  }

  // 3. Read-only tool with auto-permission
  if (tool.riskTier === 'read' && tool.permission === 'auto') {
    return {
      decision: 'allow',
      reason: `Read-only tool '${toolName}' is auto-approved under worker policy.`,
      latencyMs: Math.max(1, Date.now() - startTime),
    };
  }

  // 4. Mutating tool (write or critical) or explicit 'ask' permission -> Requires Human-in-the-Loop
  const matchedRule = findMatchingSafetyRule(worker.safetyRules || [], toolName, tool.riskTier);
  const latencyMs = Math.max(4, Date.now() - startTime);

  return {
    decision: 'ask',
    reason: `Action Shield intercepted ${tool.riskTier.toUpperCase()} action '${toolName}'. Matched Safety Rule: "${matchedRule}"`,
    matchedRule,
    latencyMs,
  };
}
