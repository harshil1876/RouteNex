/**
 * RouteNex Open Source Admin Store
 * 
 * Manages local self-hosted gateway configuration:
 * - Local virtual keys (rn-local-...)
 * - Model aliases (e.g. fast-chat -> groq/llama-3.1-8b-instant)
 * - Dynamic provider credentials (configured via UI without server restart)
 * - Compression and routing policy overrides
 */

import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';

export interface VirtualKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  rateLimitRpm: number;
}

export interface AdminSettings {
  virtualKeys: VirtualKey[];
  aliases: Record<string, string>;
  compressionEnabled: boolean;
  defaultStrategy: 'cost' | 'latency' | 'balanced' | 'explicit';
  providerKeys: {
    groq?: string;
    openai?: string;
    gemini?: string;
    anthropic?: string;
    ollamaBaseUrl?: string;
  };
}

export class AdminStore {
  private filePath: string;
  private settings: AdminSettings;
  private isMemoryOnly: boolean;

  constructor(filePath = './routenex_admin.json', memoryOnly = false) {
    this.filePath = path.resolve(filePath);
    this.isMemoryOnly = memoryOnly;
    this.settings = this.load();
  }

  private load(): AdminSettings {
    const defaultSettings: AdminSettings = {
      virtualKeys: [
        {
          id: 'vk_default',
          name: 'Default Local Key',
          key: 'rn-local-dev-default',
          createdAt: new Date().toISOString(),
          rateLimitRpm: 120,
        },
      ],
      aliases: {
        'fast': 'groq/llama-3.1-8b-instant',
        'smart': 'openai/gpt-4o-mini',
        'reason': 'gemini/gemini-2.5-flash',
      },
      compressionEnabled: true,
      defaultStrategy: 'balanced',
      providerKeys: {},
    };

    if (this.isMemoryOnly) return defaultSettings;

    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...defaultSettings,
          ...parsed,
          aliases: { ...defaultSettings.aliases, ...(parsed.aliases || {}) },
          virtualKeys: parsed.virtualKeys || defaultSettings.virtualKeys,
        };
      }
    } catch {
      // Fallback to default
    }

    return defaultSettings;
  }

  private save(): void {
    if (this.isMemoryOnly) return;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist admin settings:', err);
    }
  }

  public getSettings(): AdminSettings {
    return { ...this.settings };
  }

  public isValidKey(key: string, expectedApiKey?: string): boolean {
    if (expectedApiKey && key === expectedApiKey) return true;
    return this.settings.virtualKeys.some((vk) => vk.key === key);
  }

  public createVirtualKey(name: string, rateLimitRpm = 60): VirtualKey {
    const vk: VirtualKey = {
      id: `vk_${nanoid(8)}`,
      name,
      key: `rn-local-${nanoid(24)}`,
      createdAt: new Date().toISOString(),
      rateLimitRpm,
    };
    this.settings.virtualKeys.push(vk);
    this.save();
    return vk;
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

  public setProviderKey(provider: 'groq' | 'openai' | 'gemini' | 'anthropic' | 'ollamaBaseUrl', key: string): void {
    this.settings.providerKeys[provider] = key;
    this.save();
  }

  public setCompression(enabled: boolean): void {
    this.settings.compressionEnabled = enabled;
    this.save();
  }

  public setStrategy(strategy: 'cost' | 'latency' | 'balanced' | 'explicit'): void {
    this.settings.defaultStrategy = strategy;
    this.save();
  }
}
