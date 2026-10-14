/**
 * RouteNex Cryptographic Security Module
 * 
 * Provides:
 * - AES-256-GCM authenticated encryption at rest for provider credentials
 * - SHA-256 cryptographic hashing for virtual client keys and admin tokens
 * - Constant-time comparison for security tokens
 * - Safe key masking for UI displays
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const PREFIX = 'enc:v1:';

let cachedMasterKey: Buffer | null = null;

/**
 * Resolves or initializes the 256-bit AES master key.
 * Checks ROUTENEX_MASTER_KEY env var, then .routenex.key file, or generates a local persistent key.
 */
export function getMasterKey(customKey?: string, keyFilePath = './.routenex.key'): Buffer {
  if (cachedMasterKey) return cachedMasterKey;

  const envKey = customKey || process.env.ROUTENEX_MASTER_KEY;
  if (envKey && envKey.trim().length > 0) {
    if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
      cachedMasterKey = Buffer.from(envKey, 'hex');
      return cachedMasterKey;
    }
    // Derive 32-byte key from passphrase
    cachedMasterKey = crypto.scryptSync(envKey, 'routenex-salt-v1', 32);
    return cachedMasterKey;
  }

  // Check persistent file
  try {
    const resolvedPath = path.resolve(keyFilePath);
    if (fs.existsSync(resolvedPath)) {
      const savedHex = fs.readFileSync(resolvedPath, 'utf-8').trim();
      if (savedHex.length === 64) {
        cachedMasterKey = Buffer.from(savedHex, 'hex');
        return cachedMasterKey;
      }
    }
    // Generate new key and persist securely
    const newKey = crypto.randomBytes(32);
    try {
      fs.writeFileSync(resolvedPath, newKey.toString('hex'), { mode: 0o600 });
    } catch {}
    cachedMasterKey = newKey;
    return cachedMasterKey;
  } catch {
    // In-memory fallback if disk is not writable
    cachedMasterKey = crypto.randomBytes(32);
    return cachedMasterKey;
  }
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encryptValue(plaintext: string, masterKey?: Buffer): string {
  if (!plaintext || plaintext.startsWith(PREFIX)) return plaintext;

  const key = masterKey || getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf-8', 'hex');
  ciphertext += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Gracefully returns original text if not prefixed with enc:v1:
 */
export function decryptValue(encryptedText: string, masterKey?: Buffer): string {
  if (!encryptedText || !encryptedText.startsWith(PREFIX)) {
    return encryptedText;
  }

  const parts = encryptedText.slice(PREFIX.length).split(':');
  if (parts.length !== 3) {
    return encryptedText; // Malformed, return raw
  }

  const [ivHex, tagHex, ciphertextHex] = parts;
  const key = masterKey || getMasterKey();

  try {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  } catch {
    // If decryption fails (e.g. wrong key), return empty string to prevent secret exposure
    return '';
  }
}

/**
 * Safely masks a secret string for UI exposure (e.g. "sk-proj...a8f2").
 */
export function maskSecret(secret?: string | null): string {
  if (!secret) return '';
  const clean = secret.startsWith(PREFIX) ? decryptValue(secret) : secret;
  if (!clean || clean.length === 0) return '';
  if (clean.length <= 8) return '****';
  return `${clean.slice(0, 7)}...${clean.slice(-4)}`;
}

/**
 * Computes deterministic SHA-256 hex digest for tokens or passwords.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Constant-time string equality check to prevent timing attacks.
 */
export function secureTimingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
