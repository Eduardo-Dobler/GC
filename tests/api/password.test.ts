import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../apps/api/src/auth/password';

describe('credenciais locais', () => {
  it('não grava a senha em texto puro e rejeita a senha errada', () => {
    const credential = hashPassword('demo123');
    expect(credential.passwordHash).not.toContain('demo123');
    expect(credential.passwordSalt).not.toContain('demo123');
    expect(verifyPassword('demo123', credential.passwordSalt, credential.passwordHash)).toBe(true);
    expect(verifyPassword('incorreta', credential.passwordSalt, credential.passwordHash)).toBe(false);
  });
});
