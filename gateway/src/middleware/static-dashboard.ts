import fs from 'node:fs';
import path from 'node:path';
import type { Hono } from 'hono';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

/**
 * Mounts static asset handler for standalone offline gateway operations.
 * Serves the compiled Astro dashboard directly from dist/ without external cloud dependencies.
 */
export function mountStaticDashboard(app: Hono, staticRoot: string): void {
  app.get('*', async (c, next) => {
    // Never intercept API, health, or WebSocket routes
    const url = new URL(c.req.url);
    const pathname = url.pathname;
    if (
      pathname.startsWith('/v1') ||
      pathname.startsWith('/health') ||
      pathname.startsWith('/chat') ||
      pathname.startsWith('/models')
    ) {
      return next();
    }

    // In Open Source mode (Port 3001), root '/' strictly bypasses the marketing homepage
    // and redirects directly to the Local Gateway Console (/dashboard)
    if (pathname === '/' || pathname === '') {
      return c.redirect(`/dashboard${url.search}`);
    }
    if (pathname === '/pricing' || pathname === '/signup') {
      return c.redirect(`/dashboard`);
    }

    let relPath = pathname.replace(/^\//, '');
    if (!relPath || relPath.endsWith('/')) {
      relPath += 'index.html';
    }

    let filePath = path.resolve(staticRoot, relPath);

    // If filePath is a directory (e.g. /dashboard -> dist/dashboard), append index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.resolve(filePath, 'index.html');
    } else if (!fs.existsSync(filePath)) {
      // Check for clean URL without .html extension (e.g. /dashboard -> /dashboard.html or /dashboard/index.html)
      if (fs.existsSync(path.resolve(staticRoot, `${relPath}.html`))) {
        filePath = path.resolve(staticRoot, `${relPath}.html`);
      } else if (fs.existsSync(path.resolve(staticRoot, relPath, 'index.html'))) {
        filePath = path.resolve(staticRoot, relPath, 'index.html');
      }
    }

    // Security check: strictly prevent directory traversal (case-insensitive for Windows)
    const normFile = path.normalize(filePath).toLowerCase();
    const normRoot = path.normalize(staticRoot).toLowerCase();
    if (normFile.startsWith(normRoot) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const fileBytes = fs.readFileSync(filePath);
      return c.body(fileBytes, 200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      });
    }

    return next();
  });
}
