import { describe, expect, it } from 'vitest';
import { createApp } from './server.js';
import type { AppConfig } from './config.js';
import { reconcileWorkerSchedules } from './workers/runtime.js';

const testConfig: AppConfig = {
  port: 3001,
  host: '127.0.0.1',
  apiKey: undefined,
  mockMode: true,
  groqApiKey: undefined,
  openaiApiKey: undefined,
  logPrompts: false,
  dbPath: './test_workers.json',
  maxRetries: 2,
  timeoutMs: 5000,
  defaultStrategy: 'balanced',
  rateLimitRpm: 500,
  persistenceEnabled: false,
  allowCautionFallback: false,
};

describe('Suite: NexWorkers (Autonomous Routed Workers & Action Shield)', () => {
  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-admin-token': 'routenex-admin',
  };

  // 1. Default Worker Seeding & CRUD
  it('Default Workers: loads 4 specialist workers out of the box and supports CRUD via /v1/admin/workers', async () => {
    const { app } = createApp(testConfig);

    // List workers
    const listRes = await app.request('/v1/admin/workers', { headers: adminHeaders });
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();

    expect(listData.workers).toBeDefined();
    expect(listData.workers.length).toBeGreaterThanOrEqual(4);

    const slugs = listData.workers.map((w: any) => w.slug);
    expect(slugs).toContain('pr-guardian');
    expect(slugs).toContain('inbox-triage');
    expect(slugs).toContain('cost-watchdog');
    expect(slugs).toContain('release-architect');

    expect(listData.summary.activeWorkers).toBeGreaterThanOrEqual(4);

    // Create custom worker
    const createRes = await app.request('/v1/admin/workers', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'Custom Bug Hunter',
        slug: 'bug-hunter',
        role: 'Autonomous test suite analyzer',
        instructions: 'Analyze stack traces and suggest fixes.',
        brainModel: 'auto:balanced',
        guardModel: 'auto:free',
        pulseModel: 'auto:floor',
      }),
    });
    expect(createRes.status).toBe(200);
    const createdData = await createRes.json();
    expect(createdData.worker.slug).toBe('bug-hunter');

    // Delete custom worker
    const delRes = await app.request(`/v1/admin/workers/${createdData.worker.id}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    expect(delRes.status).toBe(200);
  });

  // 2. Read-Only Task Execution & Token Compression
  it('Read-Only Task: executes auto-approved task, compresses prompt, and creates WorkerBrief', async () => {
    const { app } = createApp(testConfig);

    const runRes = await app.request('/v1/admin/workers/pr-guardian/run', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        prompt: 'Audit git diff for security vulnerabilities in authentication middleware and database helpers.',
      }),
    });

    expect(runRes.status).toBe(200);
    const runData = await runRes.json();
    const run = runData.run;

    expect(run.status).toBe('completed');
    expect(run.totalTokensSaved).toBeGreaterThan(0);
    expect(run.outputBriefId).toBeDefined();

    // Verify steps breakdown
    const phases = run.steps.map((s: any) => s.phase);
    expect(phases).toContain('pulse');
    expect(phases).toContain('compression');
    expect(phases).toContain('tool');
    expect(phases).toContain('brain');
    expect(phases).toContain('brief');
  });

  // 3. Action Shield Interception on Mutating Write Action
  it('Action Shield Interception: write tool pauses execution with status awaiting_approval and matched rule', async () => {
    const { app } = createApp(testConfig);

    const runRes = await app.request('/v1/admin/workers/pr-guardian/run', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        prompt: 'Post review feedback comment to PR #42 saying LGTM with minor nitpicks.',
        proposedToolCall: {
          name: 'github.post_review',
          args: { pr: 42, body: 'LGTM with minor nitpicks' },
        },
      }),
    });

    expect(runRes.status).toBe(200);
    const runData = await runRes.json();
    const run = runData.run;

    expect(run.status).toBe('awaiting_approval');
    const guardStep = run.steps.find((s: any) => s.phase === 'guard');
    expect(guardStep).toBeDefined();
    expect(guardStep.toolCall.name).toBe('github.post_review');
    expect(guardStep.toolCall.approvalStatus).toBe('pending');
    expect(guardStep.toolCall.matchedRule).toBeDefined();
  });

  // 4. Operator Approval Flow
  it('Operator Approval Flow: approving paused run transitions to completed and generates brief', async () => {
    const { app } = createApp(testConfig);

    // 1. Create paused run
    const runRes = await app.request('/v1/admin/workers/pr-guardian/run', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        proposedToolCall: {
          name: 'github.post_review',
          args: { pr: 99, body: 'Approved code changes' },
        },
      }),
    });
    const runData = await runRes.json();
    const runId = runData.run.id;
    expect(runData.run.status).toBe('awaiting_approval');

    // 2. Approve run
    const approveRes = await app.request(`/v1/admin/workers/runs/${runId}/approval`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ decision: 'approve' }),
    });
    expect(approveRes.status).toBe(200);
    const approvedData = await approveRes.json();

    expect(approvedData.run.status).toBe('completed');
    expect(approvedData.run.outputBriefId).toBeDefined();
  });

  // 5. Operator Denial Flow
  it('Operator Denial Flow: denying paused run transitions to denied without executing mutating action', async () => {
    const { app } = createApp(testConfig);

    // 1. Create paused critical run (merge PR)
    const runRes = await app.request('/v1/admin/workers/pr-guardian/run', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        proposedToolCall: {
          name: 'github.merge_pr',
          args: { pr: 101, commitMessage: 'Merge security patch' },
        },
      }),
    });
    const runData = await runRes.json();
    const runId = runData.run.id;
    expect(runData.run.status).toBe('awaiting_approval');

    // 2. Deny run
    const denyRes = await app.request(`/v1/admin/workers/runs/${runId}/approval`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ decision: 'deny' }),
    });
    expect(denyRes.status).toBe(200);
    const deniedData = await denyRes.json();

    expect(deniedData.run.status).toBe('denied');
    expect(deniedData.run.finalResponse).toContain('denied by human operator');
  });

  // 6. Always-Allow Tool Permission Update
  it('Always-Allow Tool: approving with alwaysAllowTool=true updates worker permission to auto', async () => {
    const { app, adminStore } = createApp(testConfig);

    const runRes = await app.request('/v1/admin/workers/inbox-triage/run', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        proposedToolCall: {
          name: 'slack.post_summary',
          args: { channel: '#triage', message: 'Morning digest' },
        },
      }),
    });
    const runData = await runRes.json();
    const runId = runData.run.id;
    expect(runData.run.status).toBe('awaiting_approval');

    const approveRes = await app.request(`/v1/admin/workers/runs/${runId}/approval`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ decision: 'approve', alwaysAllowTool: true }),
    });
    expect(approveRes.status).toBe(200);

    const worker = adminStore.findWorker('inbox-triage');
    const slackTool = worker?.tools.find((t) => t.name === 'slack.post_summary');
    expect(slackTool?.permission).toBe('auto');
  });

  // 7. Daily Budget Circuit Breaker
  it('Budget Circuit Breaker: returns HTTP 429 worker_budget_exceeded when daily spend cap is reached', async () => {
    const { app, adminStore } = createApp(testConfig);

    // Set worker's maxDailyUsd to 0.0001 and spentTodayUsd to 0.005
    const worker = adminStore.findWorker('cost-watchdog')!;
    worker.budget.maxDailyUsd = 0.0001;
    worker.budget.spentTodayUsd = 0.005;
    adminStore.upsertWorker(worker);

    const runRes = await app.request('/v1/admin/workers/cost-watchdog/run', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ prompt: 'Check cost telemetry' }),
    });

    expect(runRes.status).toBe(429);
    const errData = await runRes.json();
    expect(errData.error.code).toBe('worker_budget_exceeded');
  });

  // 8. WorkerBrief Editing & Revision Increment
  it('WorkerBrief Editing: updating contentMarkdown increments brief revision count', async () => {
    const { app } = createApp(testConfig);

    // Generate a run to produce a brief
    const runRes = await app.request('/v1/admin/workers/release-architect/run', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ prompt: 'Draft release notes for v0.2.3' }),
    });
    const runData = await runRes.json();
    const briefId = runData.run.outputBriefId;
    expect(briefId).toBeDefined();

    // Update brief
    const updateRes = await app.request(`/v1/admin/workers/briefs/${briefId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'Updated Release Notes v0.2.3',
        contentMarkdown: '# Release Notes v0.2.3\nCustom edited notes with verified changelog.',
      }),
    });

    expect(updateRes.status).toBe(200);
    const updatedData = await updateRes.json();
    expect(updatedData.brief.revision).toBe(2);
    expect(updatedData.brief.title).toBe('Updated Release Notes v0.2.3');
  });

  // 9. Distill Run into NexSkill
  it('Distill to NexSkill: converts completed worker run into a reusable NexSkill', async () => {
    const { app } = createApp(testConfig);

    const runRes = await app.request('/v1/admin/workers/pr-guardian/run', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ prompt: 'Verify token security' }),
    });
    const runData = await runRes.json();
    const runId = runData.run.id;

    const distillRes = await app.request(`/v1/admin/workers/runs/${runId}/distill-skill`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ customName: 'Automated Token Audit Skill' }),
    });

    expect(distillRes.status).toBe(200);
    const distillData = await distillRes.json();
    expect(distillData.skill.name).toBe('Automated Token Audit Skill');
    expect(distillData.skill.source).toBe('distilled');

    // Verify it appears in workers overview skills
    const listRes = await app.request('/v1/admin/workers', { headers: adminHeaders });
    const listData = await listRes.json();
    const skillIds = listData.skills.map((s: any) => s.id);
    expect(skillIds).toContain(distillData.skill.id);
  });

  // 10. OpenAI Virtual Model Chat Completion (model: "worker/pr-guardian")
  it('Virtual Model Ingress: POST /v1/chat/completions with model "worker/pr-guardian" returns valid OpenAI response', async () => {
    const { app } = createApp(testConfig);

    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'worker/pr-guardian',
        messages: [{ role: 'user', content: 'Audit repository diff for security vulnerabilities' }],
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RouteNex-Worker-Status')).toBe('completed');
    expect(res.headers.get('X-RouteNex-Worker-Id')).toBeDefined();

    const data = await res.json();
    expect(data.id).toMatch(/^chatcmpl_worker_/);
    expect(data.choices[0].message.role).toBe('assistant');
    expect(data.choices[0].message.content).toBeDefined();
  });

  // 11. Security Gate: 401 Unauthorized for Unauthenticated Admin Requests
  it('Security Gate: unauthenticated requests to /v1/admin/workers are rejected with 401 Unauthorized', async () => {
    const { app } = createApp(testConfig);

    const resGet = await app.request('/v1/admin/workers');
    expect(resGet.status).toBe(401);

    const resPost = await app.request('/v1/admin/workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacker Worker' }),
    });
    expect(resPost.status).toBe(401);
  });

  // 12. External Webhook Trigger Security & Ingress
  it('Webhook Trigger Security: rejects unauthenticated trigger with 401, accepts valid admin token or webhook secret', async () => {
    const { app } = createApp(testConfig);

    // 1. Unauthenticated to /v1/workers/inbox-triage/trigger -> 401
    const unauthV1Res = await app.request('/v1/workers/inbox-triage/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Unauthorized ping' }),
    });
    expect(unauthV1Res.status).toBe(401);

    // 2. Unauthenticated to /workers/inbox-triage/trigger -> 401
    const unauthRootRes = await app.request('/workers/inbox-triage/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Unauthorized ping' }),
    });
    expect(unauthRootRes.status).toBe(401);

    // 3. Authenticated via x-admin-token -> 200
    const authAdminRes = await app.request('/v1/workers/inbox-triage/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'routenex-admin',
      },
      body: JSON.stringify({ prompt: 'GitHub Webhook: Push event to main with 3 commits.' }),
    });
    expect(authAdminRes.status).toBe(200);
    const authAdminData = await authAdminRes.json();
    expect(authAdminData.run.triggerType).toBe('webhook');
    expect(authAdminData.run.workerSlug).toBe('inbox-triage');

    // 4. Authenticated via x-webhook-secret -> 200
    const authSecretRes = await app.request('/workers/inbox-triage/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': 'routenex-admin',
      },
      body: JSON.stringify({ prompt: 'Webhook via secret' }),
    });
    expect(authSecretRes.status).toBe(200);
  });

  // 13. Streaming SSE Support for Virtual Model (stream: true)
  it('Streaming SSE: POST /v1/chat/completions with model "worker/pr-guardian" and stream: true returns text/event-stream with chunks and [DONE]', async () => {
    const { app } = createApp(testConfig);

    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'worker/pr-guardian',
        stream: true,
        messages: [
          { role: 'user', content: 'Turn 1: Initial query about codebase' },
          { role: 'assistant', content: 'Turn 1 answer: Ready to help.' },
          { role: 'user', content: 'Turn 2: Audit repository diff for security vulnerabilities' },
        ],
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    expect(res.headers.get('X-RouteNex-Worker-Status')).toBe('completed');
    expect(res.headers.get('X-RouteNex-Worker-Id')).toBeDefined();

    const rawText = await res.text();
    expect(rawText).toContain('data: ');
    expect(rawText).toContain('chat.completion.chunk');
    expect(rawText).toContain('[DONE]');
  });

  // 14. Discovery: Expose worker/<slug> in GET /v1/models
  it('Model Catalog Discovery: GET /v1/models includes all configured specialist workers with id worker/<slug>', async () => {
    const { app } = createApp(testConfig);

    const res = await app.request('/v1/models');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.data)).toBe(true);

    const modelIds = data.data.map((m: any) => m.id);
    expect(modelIds).toContain('worker/pr-guardian');
    expect(modelIds).toContain('worker/inbox-triage');
    expect(modelIds).toContain('worker/cost-watchdog');
    expect(modelIds).toContain('worker/release-architect');

    const prGuardianModel = data.data.find((m: any) => m.id === 'worker/pr-guardian');
    expect(prGuardianModel.owned_by).toBe('routenex-worker');
    expect(prGuardianModel.routenex.provider).toBe('nexworker');
  });

  // 15. Anthropic Protocol Parity: POST /v1/messages with model "worker/pr-guardian"
  it('Anthropic Protocol Ingress: POST /v1/messages works with model "worker/pr-guardian" in both non-streaming and streaming mode', async () => {
    const { app } = createApp(testConfig);

    // Non-streaming
    const res = await app.request('/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'worker/pr-guardian',
        messages: [
          { role: 'user', content: 'Review recent auth changes for timing attacks' },
        ],
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RouteNex-Worker-Status')).toBe('completed');
    const data = await res.json();
    expect(data.type).toBe('message');
    expect(data.role).toBe('assistant');
    expect(Array.isArray(data.content)).toBe(true);
    expect(data.content[0].type).toBe('text');
    expect(data.content[0].text).toBeDefined();

    // Streaming
    const streamRes = await app.request('/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'worker/pr-guardian',
        stream: true,
        messages: [
          { role: 'user', content: 'Stream review for timing attacks' },
        ],
      }),
    });

    expect(streamRes.status).toBe(200);
    expect(streamRes.headers.get('content-type')).toContain('text/event-stream');
    const streamText = await streamRes.text();
    expect(streamText).toContain('event: message_start');
    expect(streamText).toContain('event: content_block_delta');
    expect(streamText).toContain('event: message_stop');
  });

  // 16. Schedule Reconciliation & Missed-Run Detection
  it('Schedule Reconciliation: reconcileWorkerSchedules detects missed windows and flags missedRun = true', async () => {
    const { adminStore, engine } = createApp(testConfig);

    const worker = adminStore.findWorker('pr-guardian');
    expect(worker).toBeDefined();

    // Configure an enabled schedule with nextRunAt in the past
    worker!.schedule = {
      enabled: true,
      cron: '0 9 * * 1-5',
      label: 'Weekdays',
      prompt: 'Audit git diff',
      nextRunAt: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 hour ago
      missedRun: false,
    };
    adminStore.upsertWorker(worker!);

    const result = await reconcileWorkerSchedules(adminStore, engine);
    expect(result.missed).toBeGreaterThanOrEqual(1);

    const updatedWorker = adminStore.findWorker('pr-guardian');
    expect(updatedWorker!.schedule.missedRun).toBe(true);
  });
});
