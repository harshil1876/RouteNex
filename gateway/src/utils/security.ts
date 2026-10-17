import { timingSafeEqual } from 'node:crypto';

/**
 * Validates whether an upstream target URL is safe and not targeting internal/private networks (SSRF).
 * Blocks AWS/GCP metadata (169.254.169.254), RFC1918 private subnets, loopback, and dangerous protocols.
 */
export function validateSafeUrl(urlString: string, allowLocalhost: boolean = false): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(urlString);

    // Protocol check
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: `Disallowed protocol: ${parsed.protocol}. Only http and https are allowed.` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Loopback / Localhost check
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      if (!allowLocalhost) {
        return { safe: false, reason: 'Loopback address not permitted for external upstream' };
      }
      return { safe: true };
    }

    // Cloud metadata check (AWS / GCP / Azure Link-Local 169.254.169.254)
    if (hostname === '169.254.169.254' || hostname.startsWith('169.254.')) {
      return { safe: false, reason: 'Cloud instance metadata endpoints are strictly blocked' };
    }

    // Check IPv4 private subnets
    const parts = hostname.split('.');
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
      const [o1, o2, o3, o4] = parts.map(Number);

      // 0.0.0.0/8
      if (o1 === 0) return { safe: false, reason: 'Non-routable IP blocked' };

      // 10.0.0.0/8
      if (o1 === 10) return { safe: false, reason: 'Private 10.0.0.0/8 subnet blocked' };

      // 172.16.0.0/12
      if (o1 === 172 && o2 >= 16 && o2 <= 31) {
        return { safe: false, reason: 'Private 172.16.0.0/12 subnet blocked' };
      }

      // 192.168.0.0/16
      if (o1 === 192 && o2 === 168) {
        return { safe: false, reason: 'Private 192.168.0.0/16 subnet blocked' };
      }

      // 127.0.0.0/8
      if (o1 === 127) {
        if (!allowLocalhost) return { safe: false, reason: 'Loopback subnet blocked' };
      }
    }

    // IPv6 private/unique-local check
    if (hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80:')) {
      return { safe: false, reason: 'IPv6 unique local / link-local addresses blocked' };
    }

    return { safe: true };
  } catch (err: any) {
    return { safe: false, reason: `Malformed URL: ${err.message}` };
  }
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks on tokens and keys.
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
