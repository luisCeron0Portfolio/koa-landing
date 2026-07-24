import { expect, test } from '@playwright/test';
import { sql } from '../../src/lib/adapters/neon';

// SRS §12 / §11 Build 2: "usuario real completa RF-001 + RF-002 de punta a
// punta y queda confirmed."
//
// Con un dominio propio verificado en Resend (SPF/DKIM), el envío ya no está
// limitado al email dueño de la cuenta — este test manda a un destinatario
// arbitrario, como cualquier visitante real (RESEND_TEST_RECIPIENT_EMAIL, del
// dominio sandbox, quedó sin uso).
//
// Este test cubre hasta donde es alcanzable con las credenciales actuales:
// envío real vía Resend + insert real en Neon en `pending_confirmation`. NO
// lee de vuelta el email para extraer el token y completar el click de
// confirmación — la API key de Resend disponible es "sending access" y
// `emails.list()`/`emails.get()` devuelven 401 `restricted_api_key`.
// La mecánica de `/confirmar` en sí ya está cubierta sin depender de esto en
// confirmar.spec.ts (fixture con un token que el propio test genera).
//
// Para automatizar el click real: generar en Resend una API key con permiso
// de lectura ("Full access") y agregar la lectura de `emails.list()` acá —
// ver tasks/todo.md.
const required = ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'UPSTASH_REDIS_REST_URL'];
const missing = required.filter((key) => !process.env[key]);

test.describe('RF-001 → RF-002 — envío real de confirmación', () => {
  test.skip(missing.length > 0, `Requiere ${missing.join(', ')} reales — ver tasks/todo.md`);

  test('un envío legítimo queda pending_confirmation y Resend acepta el email', async ({ request }) => {
    const email = `full-flow-e2e-${Date.now()}@e2e.test`;

    try {
      const response = await request.post('/api/waitlist', {
        data: {
          name: 'Full Flow Test',
          email,
          consent: true,
          honeypot: '',
          turnstileToken: '1x00000000000000000000AA', // sitekey de prueba de Cloudflare, siempre pasa
        },
      });

      expect(response.status()).toBe(200);
      // Dominio propio verificado → Resend acepta cualquier destinatario.
      const body = await response.json();
      expect(body.emailSent).toBe(true);

      const rows = (await sql`SELECT status FROM leads WHERE email = ${email}`) as { status: string }[];
      expect(rows[0]?.status).toBe('pending_confirmation');
    } finally {
      await sql`DELETE FROM leads WHERE email = ${email}`;
    }
  });
});
