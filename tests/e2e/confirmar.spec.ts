import { expect, test } from '@playwright/test';
import { sql } from '../../src/lib/adapters/neon';
import { generateConfirmationToken } from '../../src/lib/domain/token';

// RF-002 — mecánica de confirmación (/confirmar). No depende de Resend: en
// vez de leer un email real, el fixture inserta el lead directo en Neon con
// un token que el propio test genera (mismo mecanismo que usa /api/waitlist),
// y ejercita la ruta real /confirmar con ese token en claro.

async function insertPendingLead(params: { email: string; tokenHash: string; tokenCreatedAt: Date }) {
  const rows = (await sql`
    INSERT INTO leads (
      name, email, status, confirmation_token_hash, confirmation_token_created_at,
      consent_timestamp, consent_text_version
    ) VALUES (
      'E2E Test', ${params.email}, 'pending_confirmation', ${params.tokenHash}, ${params.tokenCreatedAt.toISOString()},
      now(), 'v1'
    )
    RETURNING id
  `) as { id: string }[];
  return rows[0].id;
}

async function cleanupLead(email: string) {
  await sql`DELETE FROM leads WHERE email = ${email}`;
}

test.describe('RF-002 — /confirmar', () => {
  test('token válido y no expirado confirma el lead', async ({ page }) => {
    const email = `confirmar-ok-${Date.now()}@e2e.test`;
    const { token, tokenHash } = generateConfirmationToken();
    await insertPendingLead({ email, tokenHash, tokenCreatedAt: new Date() });

    try {
      const response = await page.goto(`/confirmar?token=${token}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toContainText('confirmado', { ignoreCase: true });

      const rows = (await sql`SELECT status FROM leads WHERE email = ${email}`) as { status: string }[];
      expect(rows[0].status).toBe('confirmed');
    } finally {
      await cleanupLead(email);
    }
  });

  test('token expirado (FA-01) muestra opción de reenviar y no confirma', async ({ page }) => {
    const email = `confirmar-expired-${Date.now()}@e2e.test`;
    const { token, tokenHash } = generateConfirmationToken();
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await insertPendingLead({ email, tokenHash, tokenCreatedAt: twentyFiveHoursAgo });

    try {
      const response = await page.goto(`/confirmar?token=${token}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toContainText('expiró', { ignoreCase: true });

      const rows = (await sql`SELECT status FROM leads WHERE email = ${email}`) as { status: string }[];
      expect(rows[0].status).toBe('pending_confirmation');
    } finally {
      await cleanupLead(email);
    }
  });

  test('token inválido (FA-02) responde 404 genérico', async ({ page }) => {
    const response = await page.goto('/confirmar?token=un-token-que-nunca-existio');
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toContainText('inválido', { ignoreCase: true });
  });
});
