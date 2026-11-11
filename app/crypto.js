// Encryption helpers.
// - Phone numbers and case messages are encrypted at rest with AES-256-GCM.
// - Users are identified by a keyed hash, never by their number.
// - Staff passwords are hashed with scrypt.
import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function makeCipher(base64Key) {
  const key = Buffer.from(base64Key, 'base64');
  return {
    encrypt(plain) {
      if (plain == null) return null;
      const iv = randomBytes(12);
      const c = createCipheriv('aes-256-gcm', key, iv);
      const data = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
      return Buffer.concat([iv, c.getAuthTag(), data]).toString('base64');
    },
    decrypt(blob) {
      if (blob == null) return null;
      const buf = Buffer.from(blob, 'base64');
      const d = createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
      d.setAuthTag(buf.subarray(12, 28));
      return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
    },
  };
}

export function userRef(phone, secret) {
  return createHmac('sha256', secret).update(String(phone)).digest('hex').slice(0, 16);
}

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored || '').split('$');
  if (scheme !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = scryptSync(String(password), Buffer.from(salt, 'base64'), expected.length);
  return timingSafeEqual(expected, actual);
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(s) {
  return createHmac('sha256', 'sista-token').update(s).digest('hex');
}
