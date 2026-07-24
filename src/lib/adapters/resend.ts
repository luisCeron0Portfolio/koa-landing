import { Resend } from 'resend';
import { buildWhatsAppUrl, ELEVAFORGE_URL, ELEVAFORGE_WHATSAPP_NUMBER } from '../domain/content';

// Bounded context: solo email transaccional. Nunca importar Neon ni Sanity
// desde este módulo (CLAUDE.md — Patrones de arquitectura obligatorios).

// KOA Buds es un caso de estudio ficticio de Elevaforge (CLAUDE.md — contexto
// del proyecto). El email de confirmación aclara esto y, ya que la persona
// mostró interés en una landing page, invita a contactar a la agencia por el
// producto real: "Landing Page".
const ELEVAFORGE_WHATSAPP_MESSAGE = 'Hola, quiero adquirir el producto Landing Page de Elevaforge';

function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY no está configurada.');
  }
  return new Resend(apiKey);
}

export async function sendConfirmationEmail(params: { to: string; confirmUrl: string }): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL no está configurada.');
  }

  const whatsappUrl = buildWhatsAppUrl(ELEVAFORGE_WHATSAPP_NUMBER, ELEVAFORGE_WHATSAPP_MESSAGE);

  const { error } = await getClient().emails.send({
    from,
    to: params.to,
    subject: 'Confirmá tu lugar en la lista de espera de KOA Buds',
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
        <p>Gracias por sumarte a la lista de espera de KOA Buds.</p>
        <p style="margin:24px 0">
          <a href="${params.confirmUrl}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;border-radius:999px;text-decoration:none;font-weight:600">
            Confirmar mi email
          </a>
        </p>
        <p style="color:#555;font-size:14px">Este link expira en 24 horas. Si no fuiste vos, ignorá este mensaje.</p>

        <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0" />

        <p style="color:#555;font-size:13px;line-height:1.6">
          <strong>Nota:</strong> KOA Buds es un producto ficticio — este sitio es un caso de estudio de
          demostración creado por <strong>Elevaforge</strong> para mostrar cómo construimos landing pages
          de captación como esta.
        </p>
        <p style="color:#555;font-size:13px;line-height:1.6">
          ¿Querés una landing page así para tu propio producto? Escribinos:
        </p>
        <p style="margin:16px 0">
          <a href="${ELEVAFORGE_URL}" style="color:#111;font-weight:600">${ELEVAFORGE_URL.replace('https://', '')}</a>
          &nbsp;·&nbsp;
          <a href="${whatsappUrl}" style="color:#111;font-weight:600">WhatsApp</a>
        </p>
      </div>
    `,
    text: [
      'Gracias por sumarte a la lista de espera de KOA Buds.',
      '',
      `Confirmá tu email acá: ${params.confirmUrl}`,
      '(Este link expira en 24 horas. Si no fuiste vos, ignorá este mensaje.)',
      '',
      'Nota: KOA Buds es un producto ficticio — este sitio es un caso de estudio de demostración',
      'creado por Elevaforge para mostrar cómo construimos landing pages de captación como esta.',
      '',
      `¿Querés una landing page así para tu propio producto? ${ELEVAFORGE_URL} — WhatsApp: ${whatsappUrl}`,
    ].join('\n'),
  });

  if (error) {
    // Nunca loguear el payload completo del email ni el token — solo el
    // mensaje de error de Resend (CLAUDE.md — Seguridad: logging).
    throw new Error(`Resend: no se pudo enviar el email de confirmación (${error.name}).`);
  }
}
