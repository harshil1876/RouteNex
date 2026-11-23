import { createHash, timingSafeEqual } from 'node:crypto';

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

    const rawHostname = parsed.hostname.toLowerCase();
    // Strip IPv6 brackets (Node's URL.hostname wraps IPv6 addresses in '[...]')
    const hostname = rawHostname.startsWith('[') && rawHostname.endsWith(']')
      ? rawHostname.slice(1, -1)
      : rawHostname;

    // Loopback / Localhost check
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0:0:0:0:0:0:0:1') {
      if (!allowLocalhost) {
        return { safe: false, reason: 'Loopback address not permitted for external upstream' };
      }
      return { safe: true };
    }

    // Unspecified IPv6 / IPv4
    if (hostname === '::' || hostname === '0.0.0.0') {
      return { safe: false, reason: 'Non-routable unspecified IP blocked' };
    }

    // Extract IPv4 address if IPv4-mapped IPv6 (e.g. ::ffff:169.254.169.254 or ::ffff:a9fe:a9fe)
    let ipv4Candidate = hostname;
    if (hostname.startsWith('::ffff:')) {
      const mapped = hostname.slice(7);
      if (/^\d+\.\d+\.\d+\.\d+$/.test(mapped)) {
        ipv4Candidate = mapped;
      } else {
        // Hex form (e.g. ::ffff:a9fe:a9fe or ::ffff:7f00:1) — block all IPv4-mapped IPv6 unless explicitly safe
        return { safe: false, reason: 'IPv4-mapped IPv6 address blocked' };
      }
    }

    // Cloud metadata check (AWS / GCP / Azure Link-Local 169.254.169.254)
    if (ipv4Candidate === '169.254.169.254' || ipv4Candidate.startsWith('169.254.')) {
      return { safe: false, reason: 'Cloud instance metadata endpoints are strictly blocked' };
    }

    // Check IPv4 private & reserved subnets
    const parts = ipv4Candidate.split('.');
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
      const [o1, o2] = parts.map(Number);

      // 0.0.0.0/8
      if (o1 === 0) return { safe: false, reason: 'Non-routable IP blocked' };

      // 10.0.0.0/8
      if (o1 === 10) return { safe: false, reason: 'Private 10.0.0.0/8 subnet blocked' };

      // 100.64.0.0/10 (CGNAT / Shared Address Space)
      if (o1 === 100 && o2 >= 64 && o2 <= 127) {
        return { safe: false, reason: 'CGNAT 100.64.0.0/10 subnet blocked' };
      }

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

    // IPv6 private / unique-local / link-local check
    if (hostname.includes(':') && (hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe8') || hostname.startsWith('fe9') || hostname.startsWith('fea') || hostname.startsWith('feb'))) {
      return { safe: false, reason: 'IPv6 unique local / link-local addresses blocked' };
    }

    return { safe: true };
  } catch (err: any) {
    return { safe: false, reason: `Malformed URL: ${err.message}` };
  }
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks on tokens and keys.
 * Pre-hashes inputs with SHA-256 to ensure identical 32-byte buffers.
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
