import type { APIContext } from 'astro';
import {
  decideOnExistingLead,
  isHoneypotTriggered,
  validateLeadInput,
  type LeadStatus,
} from '../../lib/domain/lead';
import { generateConfirmationToken } from '../../lib/domain/token';
import { hashIp } from '../../lib/domain/ip';
import { sql } from '../../lib/adapters/neon';
import { sendConfirmationEmail } from '../../lib/adapters/resend';
import { checkWaitlistRateLimit } from '../../lib/adapters/upstash';
import { verifyTurnstileToken } from '../../lib/adapters/turnstile';

// Función serverless — adaptador fino (CLAUDE.md): toda la lógica de negocio
// real vive en src/lib/domain, esto solo orquesta HTTP + I/O.
export const prerender = false;

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function optionalTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST({ request, clientAddress }: APIContext): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  // FA-02: honeypot oculto vía CSS. Falso-positivo silencioso, sin insert ni
  // ningún otro efecto — no se leakea información de validación a un bot.
  if (isHoneypotTriggered(body.honeypot)) {
    return json({ ok: true }, 200);
  }

  const ipHashPepper = process.env.IP_HASH_PEPPER;
  if (!ipHashPepper) {
    throw new Error('IP_HASH_PEPPER no está configurada.');
  }
  const ipHash = hashIp(clientAddress, ipHashPepper);

  // FA-03: rate limit por IP hasheada, verificado con Upstash antes de tocar
  // la DB (CLAUDE.md — Seguridad: no negociable). Se revisa antes que
  // Turnstile (invertido respecto al orden narrativo del SRS §4): es un
  // round-trip a Redis, mucho más barato que llamar a la API de Cloudflare,
  // y evita gastar cupo de verificación en tráfico que de todos modos se va
  // a rechazar por volumen.
  const rateLimit = await checkWaitlistRateLimit(ipHash);
  if (!rateLimit.allowed) {
    return json({ error: 'rate_limited', retry_after: rateLimit.retryAfterSeconds }, 429, {
      'Retry-After': String(rateLimit.retryAfterSeconds),
    });
  }

  const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken : '';
  const turnstileOk = turnstileToken !== '' && (await verifyTurnstileToken(turnstileToken, clientAddress));
  if (!turnstileOk) {
    return json({ error: 'turnstile_failed' }, 400);
  }

  const validation = validateLeadInput({
    name: body.name,
    email: body.email,
    phone: body.phone,
    consent: body.consent,
  });
  if (!validation.valid) {
    return json({ error: 'validation_failed', fields: validation.errors }, 400);
  }
  const { lead } = validation;

  const utmSource = optionalTrimmedString(body.utmSource);
  const utmMedium = optionalTrimmedString(body.utmMedium);
  const utmCampaign = optionalTrimmedString(body.utmCampaign);

  const existingRows = (await sql`
    SELECT id, status FROM leads WHERE email = ${lead.email} LIMIT 1
  `) as { id: string; status: LeadStatus }[];
  const existing = existingRows[0] ?? null;
  const action = decideOnExistingLead(existing ? { status: existing.status } : null);

  // FA-04: ya confirmado → 200 idempotente, sin duplicar ni reenviar.
  if (action === 'idempotent_confirmed') {
    return json({ ok: true }, 200);
  }

  const { token, tokenHash } = generateConfirmationToken();
  let leadId: string;

  if (action === 'insert') {
    const inserted = (await sql`
      INSERT INTO leads (
        name, email, phone, status, confirmation_token_hash,
        confirmation_token_created_at, consent_timestamp, consent_text_version,
        utm_source, utm_medium, utm_campaign
      ) VALUES (
        ${lead.name}, ${lead.email}, ${lead.phone}, 'pending_confirmation', ${tokenHash},
        now(), ${lead.consentTimestamp}, ${lead.consentTextVersion},
        ${utmSource}, ${utmMedium}, ${utmCampaign}
      )
      RETURNING id
    `) as { id: string }[];
    leadId = inserted[0].id;
  } else {
    // resend_pending: mismo lead, token nuevo con ventana de 24h nueva.
    const updated = (await sql`
      UPDATE leads
      SET confirmation_token_hash = ${tokenHash}, confirmation_token_created_at = now()
      WHERE email = ${lead.email}
      RETURNING id
    `) as { id: string }[];
    leadId = updated[0].id;
  }

  await sql`
    INSERT INTO lead_ip_hashes (lead_id, ip_hash) VALUES (${leadId}, ${ipHash})
  `;

  const confirmUrl = new URL(`/confirmar?token=${token}`, request.url).toString();
  await sendConfirmationEmail({ to: lead.email, confirmUrl });

  return json({ ok: true }, 200);
}
