import { expect, test } from '@playwright/test';
import { sql } from '../../src/lib/adapters/neon';

// SRS §12: "Test de honeypot: request con campo lleno, verificar que no hay
// insert." Corre contra Neon real — no depende de Resend/Upstash/Turnstile
// porque el honeypot se revisa antes que cualquier otra cosa en /api/waitlist.
test.describe('RF-001 — honeypot (FA-02)', () => {
  test('un request con honeypot lleno responde 200 falso-positivo sin insertar el lead', async ({
    request,
  }) => {
    const email = `honeypot-e2e-${Date.now()}@example.com`;

    const response = await request.post('/api/waitlist', {
      data: {
        name: 'Bot de prueba',
        email,
        consent: true,
        honeypot: 'un-bot-completó-este-campo',
      },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const rows = await sql`SELECT id FROM leads WHERE email = ${email}`;
    expect(rows.length).toBe(0);
  });
});
