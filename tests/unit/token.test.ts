import { describe, expect, it } from 'vitest';
import {
  CONFIRMATION_TOKEN_TTL_MS,
  generateConfirmationToken,
  hashToken,
  isTokenExpired,
  verifyToken,
} from '../../src/lib/domain/token';

describe('generateConfirmationToken', () => {
  it('genera un token aleatorio y su hash SHA-256, y nunca son iguales', () => {
    const { token, tokenHash } = generateConfirmationToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/); // 32 bytes en hex
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/); // sha256 en hex
    expect(tokenHash).not.toBe(token);
  });

  it('genera tokens distintos en cada llamada', () => {
    const a = generateConfirmationToken();
    const b = generateConfirmationToken();
    expect(a.token).not.toBe(b.token);
  });
});

describe('hashToken', () => {
  it('es determinístico: el mismo token siempre da el mismo hash', () => {
    expect(hashToken('abc123')).toBe(hashToken('abc123'));
  });

  it('nunca guarda el token en claro (el hash no lo contiene como substring)', () => {
    const token = 'un-token-secreto';
    expect(hashToken(token)).not.toContain(token);
  });
});

describe('verifyToken', () => {
  it('valida un token contra su hash correcto', () => {
    const { token, tokenHash } = generateConfirmationToken();
    expect(verifyToken(token, tokenHash)).toBe(true);
  });

  it('rechaza un token que no corresponde al hash (FA-02: inválido/ya usado)', () => {
    const { tokenHash } = generateConfirmationToken();
    expect(verifyToken('token-incorrecto', tokenHash)).toBe(false);
  });
});

describe('isTokenExpired (FA-01: expira en 24h)', () => {
  const createdAt = new Date('2026-07-23T12:00:00.000Z');

  it('no expiró a las 23h59m', () => {
    const almostExpired = new Date(createdAt.getTime() + CONFIRMATION_TOKEN_TTL_MS - 60_000);
    expect(isTokenExpired(createdAt, almostExpired)).toBe(false);
  });

  it('expiró justo pasadas las 24h', () => {
    const justExpired = new Date(createdAt.getTime() + CONFIRMATION_TOKEN_TTL_MS + 1);
    expect(isTokenExpired(createdAt, justExpired)).toBe(true);
  });
});
