import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

describe('Suite 6: NPM Packaging & Production Distribution', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  // 1. Root Dependencies Check
  it('Dependencies: root package.json contains all required gateway runtime dependencies', () => {
    const requiredDeps = [
      '@hono/node-server',
      'eventsource-parser',
      'hono',
      'nanoid',
      'zod',
    ];

    expect(pkg.dependencies).toBeDefined();
    for (const dep of requiredDeps) {
      expect(pkg.dependencies[dep], `Missing runtime dependency '${dep}' in root package.json`).toBeDefined();
    }
  });

  // 2. npm pack --dry-run --json Tarball Sanity
  it('Tarball Sanity: npm pack dry-run generates compliant package without errors', () => {
    let output: string;
    try {
      output = execSync('npm pack --dry-run --json --ignore-scripts', {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err: any) {
      throw new Error(`npm pack --dry-run --json failed: ${err.stderr || err.message}`);
    }

    const jsonStart = output.indexOf('[');
    const parsed = JSON.parse(jsonStart >= 0 ? output.slice(jsonStart) : output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);

    const pack = parsed[0];
    expect(pack.name).toBe('routenex');
    expect(pack.version).toBe(pkg.version);

    const files: string[] = pack.files.map((f: any) => f.path);

    // Verify key files are packaged
    expect(files.some((f) => f.includes('bin/routenex.js'))).toBe(true);
    expect(files.some((f) => f.includes('package.json'))).toBe(true);
    expect(files.some((f) => f.includes('README.md'))).toBe(true);
    expect(files.some((f) => f.includes('LICENSE'))).toBe(true);

    // 3. Zero Credential Leakage
    const forbiddenPatterns = [
      /\.env/i,
      /\.key$/i,
      /\.db$/i,
      /\.sqlite/i,
      /admin.*\.json$/i,
      /\.npmrc/i,
      /\.git\//i,
    ];

    for (const file of files) {
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(file), `Security hazard: forbidden file '${file}' leaked into tarball!`).toBe(false);
      }
    }
  });

  // 4. CLI Smoke Test: --version
  it('CLI Smoke Test: node bin/routenex.js --version outputs valid version and exits 0', () => {
    const binPath = path.join(rootDir, 'bin/routenex.js');
    const output = execSync(`node "${binPath}" --version`, {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    expect(output.trim()).toBe(`RouteNex v${pkg.version}`);
  });

  // 5. CLI Smoke Test: --help
  it('CLI Smoke Test: node bin/routenex.js --help prints usage guide and exits 0', () => {
    const binPath = path.join(rootDir, 'bin/routenex.js');
    const output = execSync(`node "${binPath}" --help`, {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    expect(output).toContain('RouteNex v');
    expect(output).toContain('Usage:');
    expect(output).toContain('Agent Launcher Examples:');
    expect(output).toContain('Server Options:');
  });
});
