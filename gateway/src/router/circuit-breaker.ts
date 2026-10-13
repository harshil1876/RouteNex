export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitStatus {
  state: CircuitState;
  failures: number;
  consecutiveSuccesses: number;
  lastFailureTime: number | null;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // default: 3
  cooldownMs?: number; // default: 30000 (30s)
  halfOpenSuccessThreshold?: number; // default: 2
}

/**
 * Deterministic Circuit Breaker protecting providers from cascading failures.
 */
export class CircuitBreaker {
  private readonly states: Map<string, CircuitStatus> = new Map();
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly halfOpenSuccessThreshold: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 30000;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold ?? 2;
  }

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
   * Determines if requests can be routed to the given provider.
   */
  canExecute(providerId: string): boolean {
    const state = this.getState(providerId);
    return state === 'CLOSED' || state === 'HALF_OPEN';
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

  /**
   * Returns a snapshot of circuit states across all tracked providers.
   */
  getStatus(): Record<string, CircuitStatus> {
    const result: Record<string, CircuitStatus> = {};
    for (const [id] of this.states) {
      // Calling getState ensures transitions to HALF_OPEN are applied
      const state = this.getState(id);
      const s = this.states.get(id)!;
      result[id] = { ...s, state };
    }
    return result;
  }

  /**
   * Manually resets circuit breaker state for a provider or all providers.
   */
  reset(providerId?: string): void {
    if (providerId) {
      this.states.delete(providerId);
    } else {
      this.states.clear();
    }
  }
}
