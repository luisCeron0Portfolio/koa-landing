import { expect, test } from '@playwright/test';

// SRS §12: "Test de rate limit: 6 requests consecutivos, verificar 429 en el
// sexto." BLOQUEADO sin credenciales reales de Upstash — ver tasks/todo.md.
// El chequeo de rate limit corre antes que Turnstile en /api/waitlist
// (ver comentario en src/pages/api/waitlist.ts), así que este test no
// necesita un token de Turnstile válido para llegar al 6to intento.
test.describe('RF-001 — rate limit (FA-03)', () => {
  test.skip(
    !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN,
    'Requiere UPSTASH_REDIS_REST_URL/TOKEN reales — ver tasks/todo.md (bloqueante de credenciales)',
  );

  test('el 6to intento en 10 minutos desde la misma IP responde 429 con retry_after', async ({ request }) => {
    let last: { status: number; retryAfter: unknown } | undefined;

    for (let attempt = 1; attempt <= 6; attempt++) {
      const response = await request.post('/api/waitlist', {
        data: {
          name: 'Rate Limit Test',
          email: `rate-limit-e2e-${attempt}-${Date.now()}@example.com`,
          consent: true,
          honeypot: '',
          turnstileToken: 'invalid-on-purpose',
        },
      });
      const body = await response.json().catch(() => ({}));
      last = { status: response.status(), retryAfter: body.retry_after };
    }

    expect(last?.status).toBe(429);
    expect(typeof last?.retryAfter).toBe('number');
  });
});
