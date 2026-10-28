/**
 * RouteNex NexWorkers: Types & Data Models
 * 
 * Defines schemas for Autonomous Routed Workers, Tri-Model Routing bindings,
 * Action Shield policy enforcement, and durable SQLite execution state.
 */

export type WorkerRiskTier = 'read' | 'write' | 'critical';
export type ToolPermission = 'auto' | 'ask' | 'deny';
export type WorkerStatus = 'idle' | 'running' | 'awaiting_approval' | 'paused' | 'error';
export type RunStatus = 'running' | 'awaiting_approval' | 'completed' | 'denied' | 'failed' | 'interrupted';
export type TriggerType = 'manual' | 'schedule' | 'webhook' | 'api_chat';

export interface WorkerTool {
  id: string;
  name: string;
  category: 'mcp' | 'composio' | 'builtin';
  riskTier: WorkerRiskTier;
  permission: ToolPermission;
  description?: string;
}

export interface WorkerTokenOptimization {
  logPrune: boolean;
  turnDedup: boolean;
  lexiPack: boolean;
}

export interface WorkerBudget {
  maxPerRunUsd: number;
  maxDailyUsd: number;
  spentTodayUsd: number;
  lastResetDate: string;
}

export interface WorkerSchedule {
  enabled: boolean;
  cron: string;
  label: string;
  prompt: string;
  lastRunAt?: string;
  nextRunAt?: string;
  missedRun?: boolean;
}

export interface NexWorker {
  id: string;
  slug: string; // Exposed as virtual model ID: worker/<slug>
  name: string;
  role: string;
  instructions: string;
  brainModel: string; // Frontier Smart Combo or model (e.g. 'auto:balanced' or 'combo/coding-power')
  guardModel: string; // Fast policy evaluator (default 'auto:free' or 'groq/llama-3.1-8b-instant')
  pulseModel: string; // Ultra-cheap triage model (default 'auto:floor')
  tokenOptimization: WorkerTokenOptimization;
  budget: WorkerBudget;
  safetyRules: string[]; // Plain-English human safety guidelines
  tools: WorkerTool[];
  boundSkillIds: string[];
  schedule: WorkerSchedule;
  status: WorkerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerStep {
  id: string;
  timestamp: string;
  phase: 'pulse' | 'brain' | 'tool' | 'guard' | 'compression' | 'brief';
  title: string;
  detail: string;
  modelUsed?: string;
  latencyMs?: number;
  tokensRaw?: number;
  tokensCompressed?: number;
  costUsd?: number;
  toolCall?: {
    name: string;
    args: Record<string, unknown>;
    riskTier: WorkerRiskTier;
    matchedRule?: string;
    approvalStatus?: 'pending' | 'approved' | 'denied';
  };
}

export interface WorkerRun {
  id: string;
  workerId: string;
  workerSlug: string;
  triggerType: TriggerType;
  prompt: string;
  status: RunStatus;
  steps: WorkerStep[];
  outputBriefId?: string;
  finalResponse?: string;
  totalTokensSaved: number;
  totalCostUsd: number;
  createdAt: string;
  completedAt?: string;
}

export interface WorkerBrief {
  id: string;
  workerId: string;
  workerName: string;
  runId: string;
  title: string;
  contentMarkdown: string;
  tags: string[];
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface NexSkill {
  id: string;
  name: string;
  slug: string;
  description: string;
  instructions: string;
  tools?: string[];
  source?: 'builtin' | 'distilled' | 'custom';
  tags?: string[];
  createdAt: string;
}

export interface ActionShieldDecision {
  decision: 'allow' | 'ask' | 'deny';
  reason: string;
  matchedRule?: string;
  latencyMs: number;
}

export interface WorkerTaskOptions {
  prompt: string;
  triggerType?: TriggerType;
  proposedToolCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  dryRun?: boolean;
}

/**
 * 4 Default Specialist Workers seeded out of the box with 0 fake keys and honest offline states.
 */
export const DEFAULT_SPECIALIST_WORKERS: NexWorker[] = [
  {
    id: 'worker_pr_guardian',
    slug: 'pr-guardian',
    name: 'PR & Security Guardian',
    role: 'Automated PR security auditing, vulnerability scanning, and diff verification.',
    instructions: `You are an autonomous PR Security Guardian.
Review pull request diffs for OWASP vulnerabilities, leaked API keys/tokens, authentication bypasses, and performance regressions.
Summarize findings clearly with line-by-line recommendations.
Never merge pull requests or post public comments without explicit human approval.`,
    brainModel: 'auto:balanced',
    guardModel: 'auto:free',
    pulseModel: 'auto:floor',
    tokenOptimization: {
      logPrune: true,
      turnDedup: true,
      lexiPack: true,
    },
    budget: {
      maxPerRunUsd: 0.25,
      maxDailyUsd: 2.00,
      spentTodayUsd: 0.00,
      lastResetDate: new Date().toISOString().split('T')[0],
    },
    safetyRules: [
      'Never merge PRs without human review.',
      'Ask before posting public comments or reviews on GitHub.',
      'Allow reading repository diffs, commit logs, and documentation automatically.',
    ],
    tools: [
      {
        id: 'tool_gh_diff',
        name: 'github.read_diff',
        category: 'mcp',
        riskTier: 'read',
        permission: 'auto',
        description: 'Read pull request diffs and commit patches',
      },
      {
        id: 'tool_gh_review',
        name: 'github.post_review',
        category: 'mcp',
        riskTier: 'write',
        permission: 'ask',
        description: 'Post review feedback or comments to a pull request',
      },
      {
        id: 'tool_gh_merge',
        name: 'github.merge_pr',
        category: 'mcp',
        riskTier: 'critical',
        permission: 'ask',
        description: 'Merge an approved pull request into the target branch',
      },
    ],
    boundSkillIds: ['skill_code_review'],
    schedule: {
      enabled: false,
      cron: '0 9 * * 1-5',
      label: 'Weekdays at 09:00',
      prompt: 'Review all open pull requests for security vulnerabilities and secrets.',
      missedRun: false,
    },
    status: 'idle',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'worker_inbox_triage',
    slug: 'inbox-triage',
    name: 'Inbox & Webhook Triage',
    role: 'Triage incoming webhooks, alerts, and customer messages into prioritized briefs.',
    instructions: `You are an Inbox & Webhook Triage specialist.
Filter noisy CI/CD build alerts, prioritize incoming support webhooks, and compile daily executive digests.
Always ask before sending messages to public Slack channels or replying to customer emails.`,
    brainModel: 'auto:balanced',
    guardModel: 'auto:free',
    pulseModel: 'auto:floor',
    tokenOptimization: {
      logPrune: true,
      turnDedup: true,
      lexiPack: true,
    },
    budget: {
      maxPerRunUsd: 0.15,
      maxDailyUsd: 1.50,
      spentTodayUsd: 0.00,
      lastResetDate: new Date().toISOString().split('T')[0],
    },
    safetyRules: [
      'Ask before sending external broadcast messages or Slack posts.',
      'Allow reading workspace notifications, webhooks, and inbox events automatically.',
    ],
    tools: [
      {
        id: 'tool_ws_read',
        name: 'workspace.read_events',
        category: 'builtin',
        riskTier: 'read',
        permission: 'auto',
        description: 'Read incoming webhook queues and unread event logs',
      },
      {
        id: 'tool_slack_post',
        name: 'slack.post_summary',
        category: 'composio',
        riskTier: 'write',
        permission: 'ask',
        description: 'Post digest summary to a team Slack channel',
      },
    ],
    boundSkillIds: [],
    schedule: {
      enabled: false,
      cron: '*/30 * * * *',
      label: 'Every 30 minutes',
      prompt: 'Check unread webhooks and summarize actionable items.',
      missedRun: false,
    },
    status: 'idle',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'worker_cost_watchdog',
    slug: 'cost-watchdog',
    name: 'Cost & Latency Watchdog',
    role: 'Continuously monitor gateway telemetry, identify expensive models, and propose Smart Combo optimizations.',
    instructions: `You are the RouteNex Cost & Latency Watchdog.
Audit local SQLite request telemetry, identify upstream 429 rate limit spikes or expensive token usage patterns, and suggest rebalancing Smart Combos.
Always require confirmation before mutating gateway configurations.`,
    brainModel: 'auto:balanced',
    guardModel: 'auto:free',
    pulseModel: 'auto:floor',
    tokenOptimization: {
      logPrune: true,
      turnDedup: true,
      lexiPack: true,
    },
    budget: {
      maxPerRunUsd: 0.20,
      maxDailyUsd: 2.00,
      spentTodayUsd: 0.00,
      lastResetDate: new Date().toISOString().split('T')[0],
    },
    safetyRules: [
      'Ask before updating production Smart Combos or routing strategy weights.',
      'Allow reading latency metrics, token logs, and provider health status automatically.',
    ],
    tools: [
      {
        id: 'tool_rn_telemetry',
        name: 'routenex.read_telemetry',
        category: 'builtin',
        riskTier: 'read',
        permission: 'auto',
        description: 'Query gateway latency EWMA, token counts, and error rates',
      },
      {
        id: 'tool_rn_update_combo',
        name: 'routenex.update_combo',
        category: 'builtin',
        riskTier: 'write',
        permission: 'ask',
        description: 'Update targets or priority order in a Smart Combo',
      },
    ],
    boundSkillIds: [],
    schedule: {
      enabled: false,
      cron: '0 * * * *',
      label: 'Hourly',
      prompt: 'Audit cost and latency over the past hour and recommend routing tuning.',
      missedRun: false,
    },
    status: 'idle',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'worker_release_architect',
    slug: 'release-architect',
    name: 'Release Notes & Docs Architect',
    role: 'Compile recent git commits and test results into structured changelogs and documentation briefs.',
    instructions: `You are the Release Notes & Docs Architect.
Extract git commit history since the previous release tag, categorize features, bug fixes, and breaking changes, and draft comprehensive release notes briefs.
Never publish releases or push tags without approval.`,
    brainModel: 'auto:balanced',
    guardModel: 'auto:free',
    pulseModel: 'auto:floor',
    tokenOptimization: {
      logPrune: true,
      turnDedup: true,
      lexiPack: true,
    },
    budget: {
      maxPerRunUsd: 0.30,
      maxDailyUsd: 3.00,
      spentTodayUsd: 0.00,
      lastResetDate: new Date().toISOString().split('T')[0],
    },
    safetyRules: [
      'Never publish a release tag or GitHub release without human approval.',
      'Allow reading git logs, package versions, and test outputs automatically.',
    ],
    tools: [
      {
        id: 'tool_git_log',
        name: 'git.read_commits',
        category: 'mcp',
        riskTier: 'read',
        permission: 'auto',
        description: 'Read git commit log and commit author metadata',
      },
      {
        id: 'tool_gh_release',
        name: 'github.publish_release',
        category: 'mcp',
        riskTier: 'critical',
        permission: 'ask',
        description: 'Publish a new GitHub release tag and release body',
      },
    ],
    boundSkillIds: [],
    schedule: {
      enabled: false,
      cron: '0 18 * * 5',
      label: 'Fridays at 18:00',
      prompt: 'Draft release notes from commits over the past 7 days.',
      missedRun: false,
    },
    status: 'idle',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
