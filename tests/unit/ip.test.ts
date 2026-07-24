import { describe, expect, it } from 'vitest';
import { hashIp } from '../../src/lib/domain/ip';

describe('hashIp', () => {
  it('es determinístico para la misma IP y pepper', () => {
    expect(hashIp('203.0.113.5', 'pepper-secreto')).toBe(hashIp('203.0.113.5', 'pepper-secreto'));
  });

  it('nunca deja la IP en claro dentro del hash', () => {
    expect(hashIp('203.0.113.5', 'pepper-secreto')).not.toContain('203.0.113.5');
  });

  it('da resultados distintos con distinto pepper (evita fuerza bruta sin el secreto)', () => {
    expect(hashIp('203.0.113.5', 'pepper-a')).not.toBe(hashIp('203.0.113.5', 'pepper-b'));
  });

  it('da resultados distintos para IPs distintas', () => {
    expect(hashIp('203.0.113.5', 'pepper')).not.toBe(hashIp('203.0.113.6', 'pepper'));
  });
});
