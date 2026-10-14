export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitStatus {
  state: CircuitState;
  failures: number;
  consecutiveSuccesses: number;
  lastFailureTime: number | null;
}

export interface KeyCooldownStatus {
  keyId: string;
  cooldownUntil: number;
  reason?: string;
}

export interface ModelLockoutStatus {
  modelId: string;
  lockedUntil: number;
  reason?: string;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // default: 3
  cooldownMs?: number; // default: 30000 (30s)
  halfOpenSuccessThreshold?: number; // default: 2
  defaultModelLockoutMs?: number; // default: 60000 (60s)
  defaultKeyCooldownMs?: number; // default: 30000 (30s)
}

/**
 * 3-Layer Resilience Engine for RouteNex (OmniRoute Core Architecture)
 * 
 * Layer 1: Provider Circuit Breaker (Cascading 5xx & network isolation)
 * Layer 2: Key Cooldown (HTTP 429 rate limit backoff per provider API key)
 * Layer 3: Model Lockout (Per-model overload / 404 isolation without taking down the provider)
 */
export class CircuitBreaker {
  private readonly states: Map<string, CircuitStatus> = new Map();
  private readonly keyCooldowns: Map<string, KeyCooldownStatus> = new Map();
  private readonly modelLockouts: Map<string, ModelLockoutStatus> = new Map();

  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly halfOpenSuccessThreshold: number;
  private readonly defaultModelLockoutMs: number;
  private readonly defaultKeyCooldownMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 30000;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold ?? 2;
    this.defaultModelLockoutMs = options.defaultModelLockoutMs ?? 60000;
    this.defaultKeyCooldownMs = options.defaultKeyCooldownMs ?? 30000;
  }

  // ==========================================
  // Layer 1: Provider Circuit Breaker
  // ==========================================

  private getOrCreate(providerId: string): CircuitStatus {
    let status = this.states.get(providerId);
    if (!status) {
      status = {
        state: 'CLOSED',
        failures: 0,
        consecutiveSuccesses: 0,
        lastFailureTime: null,
      };
      this.states.set(providerId, status);
    }
    return status;
  }

  /**
   * Returns current circuit state, handling automatic transition from OPEN to HALF_OPEN after cooldown.
   */
  getState(providerId: string): CircuitState {
    const status = this.getOrCreate(providerId);
    if (status.state === 'OPEN') {
      const now = Date.now();
      if (status.lastFailureTime && now - status.lastFailureTime >= this.cooldownMs) {
        status.state = 'HALF_OPEN';
        status.consecutiveSuccesses = 0;
      }
    }
    return status.state;
  }

  /**
   * Records a successful request execution for the provider.
   */
  recordSuccess(providerId: string): void {
    const status = this.getOrCreate(providerId);
    const state = this.getState(providerId);

    if (state === 'HALF_OPEN') {
      status.consecutiveSuccesses++;
      if (status.consecutiveSuccesses >= this.halfOpenSuccessThreshold) {
        status.state = 'CLOSED';
        status.failures = 0;
        status.consecutiveSuccesses = 0;
      }
    } else if (state === 'CLOSED') {
      status.failures = 0;
    }
  }

  /**
   * Records a failed request execution for the provider.
   */
  recordFailure(providerId: string): void {
    const status = this.getOrCreate(providerId);
    const state = this.getState(providerId);
    const now = Date.now();

    status.lastFailureTime = now;

    if (state === 'HALF_OPEN') {
      status.state = 'OPEN';
      status.consecutiveSuccesses = 0;
    } else if (state === 'CLOSED') {
      status.failures++;
      if (status.failures >= this.failureThreshold) {
        status.state = 'OPEN';
      }
    }
  }

  // ==========================================
  // Layer 2: Key Cooldown (Rate Limits / 429)
  // ==========================================

  /**
   * Checks if a specific API key is cooling down after a 429 response.
   */
  isKeyCoolingDown(keyId: string): boolean {
    const entry = this.keyCooldowns.get(keyId);
    if (!entry) return false;
    if (Date.now() >= entry.cooldownUntil) {
      this.keyCooldowns.delete(keyId);
      return false;
    }
    return true;
  }

  /**
   * Places an API key on cooldown for the specified duration (or Retry-After header duration).
   */
  recordKeyCooldown(keyId: string, durationMs?: number, reason?: string): void {
    const cooldownMs = durationMs ?? this.defaultKeyCooldownMs;
    this.keyCooldowns.set(keyId, {
      keyId,
      cooldownUntil: Date.now() + cooldownMs,
      reason: reason || 'HTTP 429 Rate Limit Exceeded',
    });
  }

  /**
   * Clears key cooldown on verified success.
   */
  recordKeySuccess(keyId: string): void {
    this.keyCooldowns.delete(keyId);
  }

  // ==========================================
  // Layer 3: Model Lockout (Per-model overload)
  // ==========================================

  /**
   * Checks if a specific model is locked out due to model-specific overload/404.
   */
  isModelLocked(modelId: string): boolean {
    const entry = this.modelLockouts.get(modelId);
    if (!entry) return false;
    if (Date.now() >= entry.lockedUntil) {
      this.modelLockouts.delete(modelId);
      return false;
    }
    return true;
  }

  /**
   * Locks out a single model without impacting other models under the same provider.
   */
  recordModelLockout(modelId: string, durationMs?: number, reason?: string): void {
    const lockoutMs = durationMs ?? this.defaultModelLockoutMs;
    this.modelLockouts.set(modelId, {
      modelId,
      lockedUntil: Date.now() + lockoutMs,
      reason: reason || 'Model temporarily overloaded or unavailable',
    });
  }

  /**
   * Clears model lockout on successful completion.
   */
  recordModelSuccess(modelId: string): void {
    this.modelLockouts.delete(modelId);
  }

  // ==========================================
  // Multi-Layer Evaluation
  // ==========================================

  /**
   * Determines if requests can be routed through this target across all 3 resilience layers.
   */
  canExecute(providerId: string, modelId?: string, keyId?: string): boolean {
    // 1. Layer 1 Check: Provider circuit must not be OPEN
    const providerState = this.getState(providerId);
    if (providerState === 'OPEN') {
      return false;
    }

    // 2. Layer 3 Check: Model must not be locked out
    if (modelId && this.isModelLocked(modelId)) {
      return false;
    }

    // 3. Layer 2 Check: Specific key must not be cooling down
    if (keyId && this.isKeyCoolingDown(keyId)) {
      return false;
    }

    return true;
  }

  /**
   * Returns a snapshot of circuit states across all tracked providers.
   */
  getStatus(): Record<string, CircuitStatus> {
    const result: Record<string, CircuitStatus> = {};
    for (const [id] of this.states) {
      const state = this.getState(id);
      const s = this.states.get(id)!;
      result[id] = { ...s, state };
    }
    return result;
  }

  /**
   * Returns active key cooldowns.
   */
  getKeyCooldowns(): KeyCooldownStatus[] {
    const now = Date.now();
    const active: KeyCooldownStatus[] = [];
    for (const [keyId, status] of this.keyCooldowns.entries()) {
      if (now < status.cooldownUntil) {
        active.push(status);
      } else {
        this.keyCooldowns.delete(keyId);
      }
    }
    return active;
  }

  /**
   * Returns active model lockouts.
   */
  getModelLockouts(): ModelLockoutStatus[] {
    const now = Date.now();
    const active: ModelLockoutStatus[] = [];
    for (const [modelId, status] of this.modelLockouts.entries()) {
      if (now < status.lockedUntil) {
        active.push(status);
      } else {
        this.modelLockouts.delete(modelId);
      }
    }
    return active;
  }

  /**
   * Manually resets circuit breaker state for a provider or all providers, keys, and models.
   */
  reset(providerId?: string): void {
    if (providerId) {
      this.states.delete(providerId);
    } else {
      this.states.clear();
      this.keyCooldowns.clear();
      this.modelLockouts.clear();
    }
  }
}
