import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

// Lógica de negocio pura (RF-002). El token en claro solo existe en memoria
// durante esta operación y en el email enviado — nunca se persiste (CLAUDE.md
// — Seguridad: hasheado mínimo SHA-256, nunca en claro).

export const CONFIRMATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export interface ConfirmationToken {
  token: string;
  tokenHash: string;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateConfirmationToken(): ConfirmationToken {
  const token = randomBytes(32).toString('hex');
  return { token, tokenHash: hashToken(token) };
}

export function verifyToken(token: string, tokenHash: string): boolean {
  const candidateHash = Buffer.from(hashToken(token), 'hex');
  const storedHash = Buffer.from(tokenHash, 'hex');
  if (candidateHash.length !== storedHash.length) return false;
  return timingSafeEqual(candidateHash, storedHash);
}

export function isTokenExpired(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() > CONFIRMATION_TOKEN_TTL_MS;
}
