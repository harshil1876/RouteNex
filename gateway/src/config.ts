import fs from 'node:fs';
import path from 'node:path';

/**
 * Attempts to load environment variables from local .env files.
 * Checks both current working directory and project root.
 */
function tryLoadEnv(): void {
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        if (typeof process.loadEnvFile === 'function') {
          process.loadEnvFile(envPath);
        } else {
          const content = fs.readFileSync(envPath, 'utf-8');
          for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx > 0) {
              const key = trimmed.slice(0, eqIdx).trim();
              let val = trimmed.slice(eqIdx + 1).trim();
              if (
                (val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'"))
              ) {
                val = val.slice(1, -1);
              }
              if (process.env[key] === undefined) {
                process.env[key] = val;
              }
            }
          }
        }
        break;
      } catch {
        // Silently skip if error reading .env
      }
    }
  }
}

tryLoadEnv();

export interface AppConfig {
  port: number;
  host: string;
  apiKey?: string;
  mockMode: boolean;
  groqApiKey?: string;
  openaiApiKey?: string;
  geminiApiKey?: string;
  anthropicApiKey?: string;
  mistralApiKey?: string;
  siliconflowApiKey?: string;
  ollamaBaseUrl?: string;
  logPrompts: boolean;
  dbPath: string;
  maxRetries: number;
  timeoutMs: number;
  defaultStrategy: 'cost' | 'latency' | 'balanced' | 'explicit';
  rateLimitRpm: number;
  persistenceEnabled: boolean;
}

/**
 * Parses and returns the application configuration from environment variables.
 */
export function loadConfig(): AppConfig {
  const parseBool = (val: string | undefined, defaultVal: boolean): boolean => {
    if (val === undefined) return defaultVal;
    return val.toLowerCase() === 'true' || val === '1';
  };

  const parseIntSafe = (val: string | undefined, defaultVal: number): number => {
    if (!val) return defaultVal;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? defaultVal : parsed;
  };

  const strategy = process.env.ROUTENEX_DEFAULT_STRATEGY;
  const validStrategies = ['cost', 'latency', 'balanced', 'explicit'] as const;
  const defaultStrategy = (
    strategy && validStrategies.includes(strategy as any)
      ? strategy
      : 'balanced'
  ) as 'cost' | 'latency' | 'balanced' | 'explicit';

  return {
    port: parseIntSafe(process.env.ROUTENEX_PORT, 3001),
    host: process.env.ROUTENEX_HOST || '127.0.0.1',
    apiKey: process.env.ROUTENEX_API_KEY?.trim() || undefined,
    mockMode: parseBool(process.env.ROUTENEX_MOCK_MODE, true),
    groqApiKey: process.env.GROQ_API_KEY?.trim() || undefined,
    openaiApiKey: process.env.OPENAI_API_KEY?.trim() || undefined,
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() || undefined,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() || undefined,
    mistralApiKey: process.env.MISTRAL_API_KEY?.trim() || undefined,
    siliconflowApiKey: process.env.SILICONFLOW_API_KEY?.trim() || undefined,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL?.trim() || undefined,
    logPrompts: parseBool(process.env.ROUTENEX_LOG_PROMPTS, false),
    dbPath: process.env.ROUTENEX_DB_PATH || './routenex.db',
    maxRetries: parseIntSafe(process.env.ROUTENEX_MAX_RETRIES, 2),
    timeoutMs: parseIntSafe(process.env.ROUTENEX_TIMEOUT_MS, 60000),
    defaultStrategy,
    rateLimitRpm: parseIntSafe(process.env.ROUTENEX_RATE_LIMIT_RPM, 60),
    persistenceEnabled: parseBool(process.env.ROUTENEX_PERSISTENCE, true),
  };
}

export const config = loadConfig();
