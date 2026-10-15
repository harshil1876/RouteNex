import { exec } from 'node:child_process';

/**
 * Cross-platform helper to launch the default web browser (Chrome, Edge, Safari, Firefox).
 * Gracefully ignores errors in headless / CI environments.
 */
export function openBrowser(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    let command: string;
    const platform = process.platform;

    if (platform === 'win32') {
      // Windows: use 'start "" "<url>"' to handle spaces and query parameters properly
      command = `cmd /c start "" "${url}"`;
    } else if (platform === 'darwin') {
      // macOS
      command = `open "${url}"`;
    } else {
      // Linux / Unix / BSD
      command = `xdg-open "${url}"`;
    }

    try {
      exec(command, { windowsHide: true }, (error) => {
        if (error) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Opens the RouteNex Local Dashboard directly, optionally passing an auto-authentication setup token.
 */
export function openLocalDashboard(port: number = 3001, autoToken?: string): Promise<boolean> {
  const query = autoToken ? `?auto_token=${encodeURIComponent(autoToken)}` : '';
  const url = `http://localhost:${port}/dashboard${query}`;
  return openBrowser(url);
}
