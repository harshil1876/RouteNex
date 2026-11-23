import { spawn } from 'node:child_process';

/**
 * Cross-platform helper to launch the default web browser (Chrome, Edge, Safari, Firefox).
 * Strictly validates URL protocol and uses spawn() without a shell to prevent OS command injection.
 * Gracefully ignores errors in headless / CI environments.
 */
export function openBrowser(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    let safeHref: string;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        resolve(false);
        return;
      }
      safeHref = parsed.href;
    } catch {
      resolve(false);
      return;
    }

    const platform = process.platform;
    let bin: string;
    let args: string[];

    if (platform === 'win32') {
      // Safe Windows URL opener without cmd.exe shell interpolation
      bin = 'rundll32.exe';
      args = ['url.dll,FileProtocolHandler', safeHref];
    } else if (platform === 'darwin') {
      bin = 'open';
      args = [safeHref];
    } else {
      bin = 'xdg-open';
      args = [safeHref];
    }

    try {
      const child = spawn(bin, args, {
        detached: true,
        stdio: 'ignore',
        shell: false,
        windowsHide: true,
      });
      child.on('error', () => resolve(false));
      child.unref();
      resolve(true);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Opens the RouteNex Local Dashboard directly (landing on the authentication gate).
 */
export function openLocalDashboard(port: number = 3001): Promise<boolean> {
  const url = `http://localhost:${port}/dashboard`;
  return openBrowser(url);
}
