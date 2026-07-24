import { describe, expect, it } from 'vitest';
import { formatWaitlistCount, WAITLIST_COUNT_CACHE_SECONDS } from '../../src/lib/domain/social-proof';

describe('formatWaitlistCount (RF-006)', () => {
  it('formatea el conteo con el prefijo +', () => {
    expect(formatWaitlistCount(1)).toBe('+1 personas en la lista de espera');
    expect(formatWaitlistCount(842)).toBe('+842 personas en la lista de espera');
  });

  it('nunca es negativo aunque el conteo real lo sea por algún error de datos', () => {
    expect(formatWaitlistCount(-5)).toBe('+0 personas en la lista de espera');
  });
});

describe('WAITLIST_COUNT_CACHE_SECONDS', () => {
  it('respeta el delay mínimo de 15 minutos del SRS (RF-006)', () => {
    expect(WAITLIST_COUNT_CACHE_SECONDS).toBeGreaterThanOrEqual(15 * 60);
  });
});
