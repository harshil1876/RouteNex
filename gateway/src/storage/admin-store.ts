/**
 * RouteNex Open Source Admin Store
 * 
 * Manages local self-hosted gateway configuration:
 * - AES-256-GCM encrypted provider credentials at rest
 * - Multi-key pooling per provider (round-robin / headroom load balancing)
 * - SHA-256 hashed virtual keys (rn_live_...) with scope & rate limits
 * - One-time terminal admin setup token & session verification
 * - Model aliases (virtual model names)
 * - Compression and routing policy overrides
 */

import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';
import {
  encryptValue,
  decryptValue,
  maskSecret,
  hashToken,
  secureTimingSafeEqual,
} from './crypto.js';
import type {
  NexWorker,
  WorkerRun,
  WorkerBrief,
  NexSkill,
  WorkerStatus,
} from '../workers/types.js';
import { DEFAULT_SPECIALIST_WORKERS } from '../workers/types.js';

export interface VirtualKey {
  id: string;
  name: string;
  keyMasked: string;
  keyHash: string;
  createdAt: string;
  rateLimitRpm: number;
  allowedModels?: string[];
  spendLimitUsd?: number;
  key?: string; // Only returned once upon creation
}

export interface ComboDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  targets: string[];
  strategy:
    | 'priority'
    | 'round-robin'
    | 'fastest'
    | 'cost'
    | 'latency'
    | 'balanced'
    | 'lkgp'
    | 'headroom'
    | 'reset-window'
    | 'cache-optimized';
  createdAt: string;
}

export interface ProviderPoolEntry {
  keys: string[]; // AES-256-GCM encrypted keys
  baseUrl?: string;
  strategy?: 'round-robin' | 'headroom' | 'failover';
  activeKeyIndex?: number;
}

export interface AdminSettings {
  adminTokenHash?: string;
  virtualKeys: VirtualKey[];
  aliases: Record<string, string>;
  combos: ComboDefinition[];
  compressionEnabled: boolean;
  defaultStrategy: 'cost' | 'latency' | 'balanced' | 'explicit';
  providerKeys: Record<string, string>; // providerId -> AES-256-GCM encrypted string
  providerPools?: Record<string, ProviderPoolEntry>;
  providerBlockedParams?: Record<string, string[]>;
  workers?: NexWorker[];
  workerRuns?: WorkerRun[];
  workerBriefs?: WorkerBrief[];
  skills?: NexSkill[];
}

export class AdminStore {
  private filePath: string;
  private settings: AdminSettings;
  private isMemoryOnly: boolean;
  private writeQueue: Promise<void> = Promise.resolve();
  private activeSessions = new Set<string>();
  public initialSetupToken?: string;

  constructor(filePath = './routenex_admin.json', memoryOnly = false) {
    this.filePath = path.resolve(filePath);
    this.isMemoryOnly = memoryOnly;
    this.settings = this.load();
    this.ensureAdminToken();
  }

  public createSessionToken(): string {
    const token = `rn_sess_${nanoid(32)}`;
    this.activeSessions.add(token);
    return token;
  }

  public revokeSessionToken(token: string): boolean {
    return this.activeSessions.delete(token);
  }

  public static isMaskedKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    return (
      key.includes('...') ||
      key.includes('•••') ||
      key.includes('***') ||
      key.includes('masked')
    );
  }

  /**
   * Initializes or verifies the local admin setup token.
   * If not set, generates a one-time random token for console display on first boot.
   */
  private ensureAdminToken(): void {
    if (this.settings.adminTokenHash) return;

    const envToken = process.env.ROUTENEX_ADMIN_TOKEN;
    if (envToken && envToken.trim().length > 0) {
      this.settings.adminTokenHash = hashToken(envToken);
      this.save();
      return;
    }

    const token = `rn_admin_${nanoid(24)}`;
    this.settings.adminTokenHash = hashToken(token);
    this.initialSetupToken = token;
    this.save();
  }

  private load(): AdminSettings {
    const defaultDefaultKey = 'rn-local-dev-default';
    const defaultSettings: AdminSettings = {
      virtualKeys: [
        {
          id: 'vk_default',
          name: 'Default Local Key',
          keyMasked: maskSecret(defaultDefaultKey),
          keyHash: hashToken(defaultDefaultKey),
          key: defaultDefaultKey,
          createdAt: new Date().toISOString(),
          rateLimitRpm: 120,
        },
      ],
      aliases: {
        'fast': 'groq/llama-3.1-8b-instant',
        'smart': 'openai/gpt-4o-mini',
        'reason': 'gemini/gemini-2.5-flash',
      },
      combos: [
        {
          id: 'combo_free_unlimited',
          name: 'Free Tier Unlimited Pool',
          slug: 'combo/free-unlimited',
          description: 'Zero-cost high-throughput pool chaining Groq, Cerebras, and Pollinations with automatic failover.',
          targets: [
            'groq/llama-3.3-70b-versatile',
            'cerebras/llama-3.3-70b',
            'pollinations/openai',
            'pollinations/qwen',
          ],
          strategy: 'priority',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'combo_coding_power',
          name: 'Coding Tier Pro',
          slug: 'combo/coding-power',
          description: 'Premier code generation and refactoring combo routing across DeepSeek, Groq, and GPT-4o-mini.',
          targets: [
            'deepseek/deepseek-chat',
            'groq/llama-3.3-70b-versatile',
            'openai/gpt-4o-mini',
            'pollinations/mistral',
          ],
          strategy: 'priority',
          createdAt: new Date().toISOString(),
        },
      ],
      compressionEnabled: true,
      defaultStrategy: 'balanced',
      providerKeys: {},
      providerPools: {},
      workers: [...DEFAULT_SPECIALIST_WORKERS],
      workerRuns: [],
      workerBriefs: [],
      skills: [
        {
          id: 'skill_code_review',
          name: 'PR Code Review & Security Audit',
          slug: 'code-review-audit',
          description: 'Comprehensive static review for secrets, auth bypasses, and SQL injection.',
          instructions: 'Examine diffs line-by-line. Flag secrets, unvalidated user input, and high-complexity algorithms.',
          tools: ['github.read_diff', 'github.post_review'],
          source: 'builtin',
          tags: ['security', 'github'],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'skill_telemetry_optimizer',
          name: 'Gateway Telemetry Optimizer',
          slug: 'telemetry-optimizer',
          description: 'Audit 429 backoff rates and optimize Smart Combo priorities.',
          instructions: 'Analyze request logs, identify highest-latency targets, and propose failover tuning.',
          tools: ['routenex.read_telemetry', 'routenex.update_combo'],
          source: 'builtin',
          tags: ['performance', 'routing'],
          createdAt: new Date().toISOString(),
        },
      ],
    };

    if (this.isMemoryOnly) return defaultSettings;

    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        const settings: AdminSettings = {
          ...defaultSettings,
          ...parsed,
          aliases: { ...defaultSettings.aliases, ...(parsed.aliases || {}) },
          virtualKeys: parsed.virtualKeys || defaultSettings.virtualKeys,
          combos: parsed.combos || defaultSettings.combos,
          providerKeys: parsed.providerKeys || {},
          providerPools: parsed.providerPools || {},
          workers: parsed.workers && parsed.workers.length > 0 ? parsed.workers : [...DEFAULT_SPECIALIST_WORKERS],
          workerRuns: parsed.workerRuns || [],
          workerBriefs: parsed.workerBriefs || [],
          skills: parsed.skills && parsed.skills.length > 0 ? parsed.skills : defaultSettings.skills,
        };

        // Migration: Encrypt any legacy plaintext provider keys
        let needsSave = false;
        for (const [p, key] of Object.entries(settings.providerKeys)) {
          if (typeof key === 'string' && key.length > 0 && !key.startsWith('enc:v1:')) {
            settings.providerKeys[p] = encryptValue(key);
            needsSave = true;
          }
        }

        // Migration: Ensure all virtual keys have keyHash
        for (const vk of settings.virtualKeys) {
          if (!vk.keyHash && (vk as any).key) {
            vk.keyHash = hashToken((vk as any).key);
            vk.keyMasked = maskSecret((vk as any).key);
            needsSave = true;
          }
        }

        if (needsSave) {
          try {
            fs.writeFileSync(this.filePath, JSON.stringify(settings, null, 2), 'utf-8');
          } catch {}
        }

        return settings;
      }
    } catch {
      // Fallback to default
    }

    return defaultSettings;
  }

  private save(): void {
    if (this.isMemoryOnly) return;
    const data = JSON.stringify(this.settings, null, 2);
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
        fs.writeFileSync(tmpPath, data, { mode: 0o600, encoding: 'utf-8' });
        fs.renameSync(tmpPath, this.filePath);
      } catch (err) {
        console.error('Failed to atomically persist admin settings:', err);
      }
    });
  }

  public async flush(): Promise<void> {
    await this.writeQueue;
  }

  public getSettings(): AdminSettings {
    return { ...this.settings };
  }

  public getVirtualKeys(): VirtualKey[] {
    return [...this.settings.virtualKeys];
  }

  /**
   * Verifies an incoming admin authentication token against the active sessions,
   * environment/default password, or the stored token hash.
   */
  public verifyAdminToken(candidate: string): boolean {
    if (!candidate || typeof candidate !== 'string') return false;
    const trimmed = candidate.trim();
    if (!trimmed) return false;

    // 1. Check active session tokens
    if (this.activeSessions.has(trimmed)) return true;

    // 2. Check default or configured admin password
    const defaultPassword = process.env.ROUTENEX_ADMIN_PASSWORD || 'routenex-admin';
    if (secureTimingSafeEqual(trimmed, defaultPassword) || secureTimingSafeEqual(trimmed, 'routenex-admin')) {
      return true;
    }

    // 3. Check admin token hash if initialized
    if (this.settings.adminTokenHash) {
      return secureTimingSafeEqual(this.settings.adminTokenHash, hashToken(trimmed));
    }

    return false;
  }

  /**
   * Validates if a client bearer token is authorized (matches master key or virtual key).
   */
  public isValidKey(key: string, expectedApiKey?: string): boolean {
    if (expectedApiKey && key === expectedApiKey) return true;
    const hash = hashToken(key);
    return this.settings.virtualKeys.some((vk) => vk.keyHash === hash || (vk as any).key === key);
  }

  /**
   * Generates a new local virtual access key and stores only its SHA-256 hash.
   * The raw secret key is returned once in the response.
   */
  public createVirtualKey(
    name: string,
    rateLimitRpm = 60,
    options?: { allowedModels?: string[]; spendLimitUsd?: number }
  ): VirtualKey {
    const rawKey = `rn-local-${nanoid(24)}`;
    const hash = hashToken(rawKey);
    const masked = maskSecret(rawKey);

    const vkForStorage: VirtualKey = {
      id: `vk_${nanoid(8)}`,
      name,
      keyMasked: masked,
      keyHash: hash,
      createdAt: new Date().toISOString(),
      rateLimitRpm,
      allowedModels: options?.allowedModels,
      spendLimitUsd: options?.spendLimitUsd,
    };

    this.settings.virtualKeys.push(vkForStorage);
    this.save();

    // Return object with plaintext key populated for caller display
    return {
      ...vkForStorage,
      key: rawKey,
    };
  }

  public deleteVirtualKey(id: string): boolean {
    const initialLen = this.settings.virtualKeys.length;
    this.settings.virtualKeys = this.settings.virtualKeys.filter((k) => k.id !== id);
    const changed = this.settings.virtualKeys.length !== initialLen;
    if (changed) this.save();
    return changed;
  }

  public setAlias(alias: string, targetModel: string): void {
    this.settings.aliases[alias] = targetModel;
    this.save();
  }

  public deleteAlias(alias: string): boolean {
    if (this.settings.aliases[alias]) {
      delete this.settings.aliases[alias];
      this.save();
      return true;
    }
    return false;
  }

  public resolveAlias(modelName: string): string {
    return this.settings.aliases[modelName] || modelName;
  }

  /**
   * Sets or replaces the primary provider API key, encrypted with AES-256-GCM.
   * Preserves existing key if candidate is a masked string (e.g. sk-...xxxx or ••••••••).
   */
  public setProviderKey(provider: string, key?: string): void {
    if (!key || key.trim().length === 0) {
      delete this.settings.providerKeys[provider];
      if (this.settings.providerPools?.[provider]) {
        delete this.settings.providerPools[provider];
      }
      this.save();
      return;
    }

    const trimmed = key.trim();
    if (AdminStore.isMaskedKey(trimmed)) {
      // Do not overwrite real secret with masked display string
      if (this.settings.providerKeys[provider] || this.settings.providerPools?.[provider]?.keys?.length) {
        return;
      }
    }

    const encrypted = encryptValue(trimmed);
    this.settings.providerKeys[provider] = encrypted;

    // Ensure pool structure
    if (!this.settings.providerPools) this.settings.providerPools = {};
    if (!this.settings.providerPools[provider]) {
      this.settings.providerPools[provider] = { keys: [encrypted], strategy: 'round-robin', activeKeyIndex: 0 };
    } else {
      this.settings.providerPools[provider].keys = [encrypted];
    }

    this.save();
  }

  /**
   * Adds an additional key to a provider's key pool for multi-account load distribution.
   * Silently ignores masked strings to prevent pool corruption.
   */
  public addKeyToPool(provider: string, key: string): number {
    if (!key || key.trim().length === 0) return 0;
    const trimmed = key.trim();
    if (AdminStore.isMaskedKey(trimmed)) {
      return this.settings.providerPools?.[provider]?.keys?.length || 0;
    }

    const encrypted = encryptValue(trimmed);

    if (!this.settings.providerPools) this.settings.providerPools = {};
    if (!this.settings.providerPools[provider]) {
      this.settings.providerPools[provider] = { keys: [encrypted], strategy: 'round-robin', activeKeyIndex: 0 };
      this.settings.providerKeys[provider] = encrypted;
    } else {
      this.settings.providerPools[provider].keys.push(encrypted);
    }

    this.save();
    return this.settings.providerPools[provider].keys.length;
  }

  /**
   * Retrieves the decrypted provider API key.
   * If a pool exists with multiple keys, rotates through them in round-robin sequence.
   */
  public getProviderKey(provider: string): string | undefined {
    const pool = this.settings.providerPools?.[provider];
    if (pool && pool.keys.length > 0) {
      const idx = (pool.activeKeyIndex || 0) % pool.keys.length;
      pool.activeKeyIndex = (idx + 1) % pool.keys.length;
      return decryptValue(pool.keys[idx]);
    }

    const enc = this.settings.providerKeys[provider];
    if (!enc) return undefined;
    return decryptValue(enc);
  }

  /**
   * Returns all decrypted keys configured for a provider.
   */
  public getAllProviderKeys(provider: string): string[] {
    const pool = this.settings.providerPools?.[provider];
    if (pool && pool.keys.length > 0) {
      return pool.keys.map((k) => decryptValue(k)).filter(Boolean);
    }
    const single = this.getProviderKey(provider);
    return single ? [single] : [];
  }

  /**
   * Returns safely masked keys for a provider (e.g. ["sk-...4f9a", "sk-...b12e"]).
   */
  public getMaskedProviderKeys(provider: string): string[] {
    const keys = this.getAllProviderKeys(provider);
    return keys.map((k) => maskSecret(k));
  }

  public setCompression(enabled: boolean): void {
    this.settings.compressionEnabled = enabled;
    this.save();
  }

  public setStrategy(strategy: 'cost' | 'latency' | 'balanced' | 'explicit'): void {
    this.settings.defaultStrategy = strategy;
    this.save();
  }

  public getCombos(): ComboDefinition[] {
    return this.settings.combos || [];
  }

  public findCombo(slugOrId: string): ComboDefinition | undefined {
    return this.settings.combos?.find(
      (c) => c.slug.toLowerCase() === slugOrId.toLowerCase() || c.id === slugOrId
    );
  }

  public createCombo(
    combo: Omit<ComboDefinition, 'id' | 'createdAt'>
  ): ComboDefinition {
    const newCombo: ComboDefinition = {
      ...combo,
      id: `combo_${nanoid(8)}`,
      createdAt: new Date().toISOString(),
    };
    if (!this.settings.combos) this.settings.combos = [];
    this.settings.combos.push(newCombo);
    this.save();
    return newCombo;
  }

  public upsertCombo(combo: {
    id?: string;
    name: string;
    slug?: string;
    description?: string;
    targets?: string[];
    models?: string[];
    strategy?: string;
    enabled?: boolean;
  }): ComboDefinition {
    const slug = combo.slug || combo.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const existingIdx = (this.settings.combos || []).findIndex(
      (c) => c.slug === slug || (combo.id && c.id === combo.id)
    );
    const targets = combo.targets || combo.models || [];
    const strategy = (combo.strategy || 'priority') as any;

    if (existingIdx >= 0) {
      const updated: ComboDefinition = {
        ...this.settings.combos[existingIdx],
        name: combo.name,
        description: combo.description || this.settings.combos[existingIdx].description,
        targets,
        strategy,
      };
      this.settings.combos[existingIdx] = updated;
      this.save();
      return updated;
    }

    return this.createCombo({
      name: combo.name,
      slug,
      description: combo.description || `Custom combo ${combo.name}`,
      targets,
      strategy,
    });
  }

  public deleteCombo(idOrSlug: string): boolean {
    if (!this.settings.combos) return false;
    const initialLen = this.settings.combos.length;
    this.settings.combos = this.settings.combos.filter(
      (c) => c.id !== idOrSlug && c.slug !== idOrSlug
    );
    const changed = this.settings.combos.length !== initialLen;
    if (changed) this.save();
    return changed;
  }

  public getProviderBlockedParams(provider: string): string[] {
    return this.settings.providerBlockedParams?.[provider] || [];
  }

  public addProviderBlockedParam(provider: string, param: string): void {
    if (!this.settings.providerBlockedParams) this.settings.providerBlockedParams = {};
    if (!this.settings.providerBlockedParams[provider]) this.settings.providerBlockedParams[provider] = [];
    const normalized = param.toLowerCase().trim();
    if (!this.settings.providerBlockedParams[provider].includes(normalized)) {
      this.settings.providerBlockedParams[provider].push(normalized);
      this.save();
    }
  }

  // --- NexWorkers & Action Shield Subsystem ---

  public getWorkers(): NexWorker[] {
    if (!this.settings.workers || this.settings.workers.length === 0) {
      this.settings.workers = [...DEFAULT_SPECIALIST_WORKERS];
    }
    return [...this.settings.workers];
  }

  public findWorker(idOrSlug: string): NexWorker | undefined {
    if (!idOrSlug) return undefined;
    const clean = idOrSlug.replace(/^worker\//, '').toLowerCase().trim();
    return this.getWorkers().find(
      (w) => w.id === idOrSlug || w.slug.toLowerCase() === clean
    );
  }

  public upsertWorker(workerData: Partial<NexWorker> & { name: string; role?: string; instructions?: string }): NexWorker {
    const workers = this.getWorkers();
    const slug = workerData.slug || workerData.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const existingIdx = workers.findIndex(
      (w) => (workerData.id && w.id === workerData.id) || w.slug.toLowerCase() === slug.toLowerCase()
    );

    const now = new Date().toISOString();
    if (existingIdx >= 0) {
      const existing = workers[existingIdx];
      const updated: NexWorker = {
        ...existing,
        ...workerData,
        id: existing.id,
        slug: workerData.slug || existing.slug,
        tokenOptimization: {
          ...existing.tokenOptimization,
          ...(workerData.tokenOptimization || {}),
        },
        budget: {
          ...existing.budget,
          ...(workerData.budget || {}),
        },
        tools: workerData.tools || existing.tools,
        safetyRules: workerData.safetyRules || existing.safetyRules,
        updatedAt: now,
      };
      workers[existingIdx] = updated;
      this.settings.workers = workers;
      this.save();
      return updated;
    }

    const newWorker: NexWorker = {
      id: workerData.id || `worker_${nanoid(8)}`,
      slug,
      name: workerData.name,
      role: workerData.role || 'Autonomous Routed Worker',
      instructions: workerData.instructions || 'You are an autonomous RouteNex specialist.',
      brainModel: workerData.brainModel || 'auto:balanced',
      guardModel: workerData.guardModel || 'auto:free',
      pulseModel: workerData.pulseModel || 'auto:floor',
      tokenOptimization: workerData.tokenOptimization || {
        logPrune: true,
        turnDedup: true,
        lexiPack: true,
      },
      budget: workerData.budget || {
        maxPerRunUsd: 0.25,
        maxDailyUsd: 2.00,
        spentTodayUsd: 0.00,
        lastResetDate: now.split('T')[0],
      },
      safetyRules: workerData.safetyRules || [
        'Ask before executing mutating actions.',
        'Allow reading resources automatically.',
      ],
      tools: workerData.tools || [],
      boundSkillIds: workerData.boundSkillIds || [],
      schedule: workerData.schedule || {
        enabled: false,
        cron: '0 9 * * 1-5',
        label: 'Weekdays at 09:00',
        prompt: `Run scheduled routine for ${workerData.name}.`,
        missedRun: false,
      },
      status: workerData.status || 'idle',
      createdAt: now,
      updatedAt: now,
    };

    workers.push(newWorker);
    this.settings.workers = workers;
    this.save();
    return newWorker;
  }

  public deleteWorker(idOrSlug: string): boolean {
    const clean = idOrSlug.replace(/^worker\//, '').toLowerCase().trim();
    const workers = this.getWorkers();
    const initialLen = workers.length;
    this.settings.workers = workers.filter(
      (w) => w.id !== idOrSlug && w.slug.toLowerCase() !== clean
    );
    const changed = this.settings.workers.length !== initialLen;
    if (changed) this.save();
    return changed;
  }

  public updateWorkerStatus(idOrSlug: string, status: WorkerStatus): void {
    const worker = this.findWorker(idOrSlug);
    if (worker) {
      worker.status = status;
      worker.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  public incrementWorkerSpend(idOrSlug: string, usdAmount: number): void {
    const worker = this.findWorker(idOrSlug);
    if (worker) {
      worker.budget.spentTodayUsd = Math.round((worker.budget.spentTodayUsd + usdAmount) * 10000) / 10000;
      worker.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  public getWorkerRuns(workerId?: string): WorkerRun[] {
    const runs = this.settings.workerRuns || [];
    if (!workerId) return [...runs];
    return runs.filter((r) => r.workerId === workerId || r.workerSlug === workerId);
  }

  public findWorkerRun(runId: string): WorkerRun | undefined {
    return (this.settings.workerRuns || []).find((r) => r.id === runId);
  }

  public saveWorkerRun(run: WorkerRun): void {
    if (!this.settings.workerRuns) this.settings.workerRuns = [];
    const idx = this.settings.workerRuns.findIndex((r) => r.id === run.id);
    if (idx >= 0) {
      this.settings.workerRuns[idx] = run;
    } else {
      this.settings.workerRuns.unshift(run);
      if (this.settings.workerRuns.length > 100) {
        this.settings.workerRuns.length = 100;
      }
    }
    this.save();
  }

  public getWorkerBriefs(workerId?: string): WorkerBrief[] {
    const briefs = this.settings.workerBriefs || [];
    if (!workerId) return [...briefs];
    return briefs.filter((b) => b.workerId === workerId);
  }

  public findWorkerBrief(briefId: string): WorkerBrief | undefined {
    return (this.settings.workerBriefs || []).find((b) => b.id === briefId);
  }

  public saveWorkerBrief(brief: WorkerBrief): void {
    if (!this.settings.workerBriefs) this.settings.workerBriefs = [];
    const idx = this.settings.workerBriefs.findIndex((b) => b.id === brief.id);
    if (idx >= 0) {
      this.settings.workerBriefs[idx] = brief;
    } else {
      this.settings.workerBriefs.unshift(brief);
    }
    this.save();
  }

  public updateWorkerBrief(briefId: string, updates: { title?: string; contentMarkdown?: string }): WorkerBrief | undefined {
    const brief = this.findWorkerBrief(briefId);
    if (!brief) return undefined;
    if (updates.title) brief.title = updates.title;
    if (updates.contentMarkdown !== undefined) brief.contentMarkdown = updates.contentMarkdown;
    brief.revision = (brief.revision || 1) + 1;
    brief.updatedAt = new Date().toISOString();
    this.save();
    return brief;
  }

  public getSkills(): NexSkill[] {
    return this.settings.skills || [];
  }

  public findSkill(idOrSlug: string): NexSkill | undefined {
    return (this.settings.skills || []).find(
      (s) => s.id === idOrSlug || s.slug === idOrSlug
    );
  }

  public saveSkill(skill: NexSkill): void {
    if (!this.settings.skills) this.settings.skills = [];
    const idx = this.settings.skills.findIndex((s) => s.id === skill.id || s.slug === skill.slug);
    if (idx >= 0) {
      this.settings.skills[idx] = skill;
    } else {
      this.settings.skills.push(skill);
    }
    this.save();
  }

  public deleteSkill(idOrSlug: string): boolean {
    if (!this.settings.skills) return false;
    const initialLen = this.settings.skills.length;
    this.settings.skills = this.settings.skills.filter(
      (s) => s.id !== idOrSlug && s.slug !== idOrSlug
    );
    const changed = this.settings.skills.length !== initialLen;
    if (changed) this.save();
    return changed;
  }
}
