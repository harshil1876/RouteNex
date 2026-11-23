/**
 * RouteNex One-Click CLI Agent Config Writers & Live Status Detector
 *
 * Safely detects, backs up (*.routenex.bak), applies, and restores local CLI agent
 * configurations for Claude Code, Codex CLI, OpenCode, Aider, and Continue.
 * Strictly enforces home-directory path containment.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type SupportedCliTool = 'claude' | 'codex' | 'opencode' | 'aider' | 'continue';

export interface CliToolStatus {
  id: SupportedCliTool;
  name: string;
  configPath: string;
  exists: boolean;
  configuredForRouteNex: boolean;
  hasBackup: boolean;
  backupPath: string;
}

export interface ApplyCliToolOptions {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  homeOverride?: string;
}

export interface ApplyCliToolResult {
  success: boolean;
  tool: SupportedCliTool;
  path: string;
  backupPath?: string;
  message: string;
}

export const SUPPORTED_CLI_TOOLS: Array<{ id: SupportedCliTool; name: string }> = [
  { id: 'claude', name: 'Claude Code CLI' },
  { id: 'codex', name: 'OpenAI Codex CLI' },
  { id: 'opencode', name: 'OpenCode CLI' },
  { id: 'aider', name: 'Aider' },
  { id: 'continue', name: 'Continue (VS Code / JetBrains)' },
];

function resolveSafeRoot(homeOverride?: string): string {
  const realHome = path.resolve(os.homedir());
  if (!homeOverride) {
    return realHome;
  }
  const resolved = path.resolve(homeOverride);
  const allowedRoots = [realHome, ...(process.env.VITEST ? [path.resolve(process.cwd())] : [])];
  const normTarget = resolved.toLowerCase();
  const isContained = allowedRoots.some((root) => {
    const normRoot = root.toLowerCase();
    const withSep = normRoot.endsWith(path.sep) ? normRoot : `${normRoot}${path.sep}`;
    return normTarget === normRoot || normTarget.startsWith(withSep);
  });
  if (!isContained) {
    throw new Error('Unsafe target directory: path must remain inside user home directory.');
  }
  return resolved;
}

export function getCliToolConfigPath(tool: SupportedCliTool, homeOverride?: string): string {
  const root = resolveSafeRoot(homeOverride);
  switch (tool) {
    case 'claude':
      return path.join(root, '.claude', 'settings.json');
    case 'codex':
      return path.join(root, '.codex', 'config.toml');
    case 'opencode':
      return path.join(root, '.config', 'opencode', 'opencode.json');
    case 'aider':
      return path.join(root, '.aider.conf.yml');
    case 'continue':
      return path.join(root, '.continue', 'config.json');
  }
}

export function isSupportedCliTool(tool: string): tool is SupportedCliTool {
  return SUPPORTED_CLI_TOOLS.some((t) => t.id === tool);
}

/**
 * Inspects all supported CLI agent config files and reports installation,
 * RouteNex binding status, and backup availability.
 */
export function getCliToolsStatus(homeOverride?: string): CliToolStatus[] {
  return SUPPORTED_CLI_TOOLS.map(({ id, name }) => {
    const configPath = getCliToolConfigPath(id, homeOverride);
    const backupPath = `${configPath}.routenex.bak`;
    const exists = fs.existsSync(configPath);
    const hasBackup = fs.existsSync(backupPath);
    let configuredForRouteNex = false;

    if (exists) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8').toLowerCase();
        configuredForRouteNex =
          content.includes('127.0.0.1:3001') ||
          content.includes('localhost:3001') ||
          content.includes('routenex');
      } catch {
        configuredForRouteNex = false;
      }
    }

    return {
      id,
      name,
      configPath,
      exists,
      configuredForRouteNex,
      hasBackup,
      backupPath,
    };
  });
}

function ensureBackup(configPath: string): string | undefined {
  if (!fs.existsSync(configPath)) return undefined;
  const backupPath = `${configPath}.routenex.bak`;
  // Preserve original pre-RouteNex backup if one already exists; otherwise create it
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(configPath, backupPath);
  }
  return backupPath;
}

/**
 * Safely writes or merges RouteNex gateway settings into a target CLI agent's config file.
 */
export function applyCliToolConfig(
  tool: SupportedCliTool,
  options: ApplyCliToolOptions = {}
): ApplyCliToolResult {
  const baseUrl = (options.baseUrl || 'http://127.0.0.1:3001').replace(/\/+$/, '');
  const apiKey = options.apiKey || 'rn-local-dev-default';
  const model = options.model || 'combo/free-unlimited';
  const configPath = getCliToolConfigPath(tool, options.homeOverride);
  const dir = path.dirname(configPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const backupPath = ensureBackup(configPath);

  if (tool === 'claude') {
    let current: Record<string, any> = {};
    if (fs.existsSync(configPath)) {
      try {
        current = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch {}
    }
    const merged = {
      ...current,
      $schema: 'https://json.schemastore.org/claude-code-settings.json',
      model,
      env: {
        ...(current.env || {}),
        ANTHROPIC_BASE_URL: baseUrl,
        ANTHROPIC_AUTH_TOKEN: apiKey,
        ANTHROPIC_MODEL: model,
        ANTHROPIC_DEFAULT_SONNET_MODEL: model,
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'combo/coding-power',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'pollinations/openai',
        CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: '1',
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
  } else if (tool === 'codex') {
    const tomlBlock = [
      '# Managed by RouteNex CLI Setup',
      `model_provider = "routenex"`,
      `model = "${model}"`,
      '',
      '[model_providers.routenex]',
      'name = "RouteNex Local Gateway"',
      `base_url = "${baseUrl}/v1"`,
      'env_key = "ROUTENEX_API_KEY"',
      'wire_api = "responses"',
      '',
    ].join('\n');
    fs.writeFileSync(configPath, tomlBlock, 'utf-8');
  } else if (tool === 'opencode') {
    let current: Record<string, any> = {};
    if (fs.existsSync(configPath)) {
      try {
        current = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch {}
    }
    const merged = {
      ...current,
      $schema: 'https://opencode.ai/config.json',
      model: `routenex/${model}`,
      provider: {
        ...(current.provider || {}),
        routenex: {
          npm: '@ai-sdk/openai-compatible',
          name: 'RouteNex Gateway',
          options: {
            baseURL: `${baseUrl}/v1`,
            apiKey,
          },
          models: {
            [model]: { name: `RouteNex (${model})` },
          },
        },
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
  } else if (tool === 'aider') {
    const yamlContent = [
      '# Managed by RouteNex CLI Setup',
      `openai-api-base: ${baseUrl}/v1`,
      `openai-api-key: ${apiKey}`,
      `model: openai/${model}`,
      '',
    ].join('\n');
    fs.writeFileSync(configPath, yamlContent, 'utf-8');
  } else if (tool === 'continue') {
    let current: Record<string, any> = {};
    if (fs.existsSync(configPath)) {
      try {
        current = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch {}
    }
    const existingModels = Array.isArray(current.models)
      ? current.models.filter((m: any) => m?.title !== 'RouteNex Gateway')
      : [];
    const merged = {
      ...current,
      models: [
        {
          title: 'RouteNex Gateway',
          provider: 'openai',
          model,
          apiBase: `${baseUrl}/v1`,
          apiKey,
        },
        ...existingModels,
      ],
    };
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
  }

  return {
    success: true,
    tool,
    path: configPath,
    backupPath,
    message: `Configured ${tool} at ${configPath}${backupPath ? ` (backup saved to ${backupPath})` : ''}.`,
  };
}

/**
 * Restores a previously backed-up CLI tool configuration from *.routenex.bak.
 */
export function restoreCliToolConfig(
  tool: SupportedCliTool,
  homeOverride?: string
): ApplyCliToolResult {
  const configPath = getCliToolConfigPath(tool, homeOverride);
  const backupPath = `${configPath}.routenex.bak`;

  if (!fs.existsSync(backupPath)) {
    return {
      success: false,
      tool,
      path: configPath,
      message: `No backup found at ${backupPath}.`,
    };
  }

  fs.copyFileSync(backupPath, configPath);
  return {
    success: true,
    tool,
    path: configPath,
    backupPath,
    message: `Restored ${tool} configuration from ${backupPath}.`,
  };
}
