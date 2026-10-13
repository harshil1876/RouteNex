import fs from 'node:fs';
import path from 'node:path';

export interface RequestLogEntry {
  request_id: string;
  timestamp: string;
  model_requested: string;
  model_used: string;
  provider: string;
  latency_ms: number;
  status: 'success' | 'error';
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost_estimate?: {
    total_usd: number | null;
    provenance: 'MEASURED' | 'ESTIMATED' | 'UNKNOWN';
    price_timestamp: string | null;
  };
  routing_reason: string;
  prompt_preview?: string;
}

export interface UsageStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  avg_latency_ms: number;
  tokens: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  estimated_cost_usd: number;
}

/**
 * File-based JSON request logger and usage statistics store.
 */
export class RequestStore {
  private records: RequestLogEntry[] = [];
  private buffer: RequestLogEntry[] = [];
  private readonly filePath: string;
  private readonly enabled: boolean;
  private flushTimer?: NodeJS.Timeout;

  constructor(filePath: string = './routenex.db', enabled: boolean = true) {
    // If the path ends with .db, normalize to .json for simple JSON storage
    this.filePath = filePath.endsWith('.db')
      ? filePath.replace(/\.db$/, '.json')
      : filePath;
    this.enabled = enabled;

    if (this.enabled) {
      this.loadFromDisk();
      this.flushTimer = setInterval(() => {
        this.flush();
      }, 5000);

      if (typeof this.flushTimer.unref === 'function') {
        this.flushTimer.unref();
      }
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        if (raw.trim()) {
          this.records = JSON.parse(raw);
        }
      }
    } catch {
      this.records = [];
    }
  }

  /**
   * Flushes in-memory buffered records to disk.
   */
  public flush(): void {
    if (!this.enabled || this.buffer.length === 0) return;

    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.filePath, JSON.stringify(this.records, null, 2), 'utf-8');
      this.buffer = [];
    } catch {
      // Silently prevent logging write errors from breaking requests
    }
  }

  /**
   * Records a request execution into the store.
   */
  public logRequest(entry: RequestLogEntry): void {
    if (!this.enabled) return;

    this.records.push(entry);
    this.buffer.push(entry);

    if (this.buffer.length >= 10) {
      this.flush();
    }
  }

  /**
   * Returns recent request log entries, ordered newest to oldest.
   */
  public getRecentRequests(limit: number = 50): RequestLogEntry[] {
    return [...this.records].reverse().slice(0, limit);
  }

  /**
   * Aggregates usage statistics across all recorded requests.
   */
  public getUsageStats(): UsageStats {
    let totalPrompt = 0;
    let totalComp = 0;
    let totalTokens = 0;
    let totalCost = 0;
    let totalLatency = 0;
    let successful = 0;
    let failed = 0;

    for (const r of this.records) {
      if (r.status === 'success') successful++;
      else failed++;

      totalLatency += r.latency_ms || 0;

      if (r.token_usage) {
        totalPrompt += r.token_usage.prompt_tokens || 0;
        totalComp += r.token_usage.completion_tokens || 0;
        totalTokens += r.token_usage.total_tokens || 0;
      }

      if (r.cost_estimate?.total_usd) {
        totalCost += r.cost_estimate.total_usd;
      }
    }

    const total = this.records.length;
    const successRate = total > 0 ? Number((successful / total).toFixed(4)) : 1.0;
    const avgLatency = total > 0 ? Math.round(totalLatency / total) : 0;

    return {
      total_requests: total,
      successful_requests: successful,
      failed_requests: failed,
      success_rate: successRate,
      avg_latency_ms: avgLatency,
      tokens: {
        prompt_tokens: totalPrompt,
        completion_tokens: totalComp,
        total_tokens: totalTokens,
      },
      estimated_cost_usd: Number(totalCost.toFixed(6)),
    };
  }

  /**
   * Closes store and performs final flush.
   */
  public close(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}
