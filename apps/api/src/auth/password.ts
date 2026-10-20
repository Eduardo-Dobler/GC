import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export interface PasswordCredential {
  passwordSalt: string;
  passwordHash: string;
}

export function hashPassword(password: string): PasswordCredential {
  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = scryptSync(password, passwordSalt, 64).toString('hex');
  return { passwordSalt, passwordHash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  try {
    const expected = Buffer.from(hash, 'hex');
    const actual = scryptSync(password, salt, 64);
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
