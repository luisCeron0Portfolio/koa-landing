import { Resend } from 'resend';

// Bounded context: solo email transaccional. Nunca importar Neon ni Sanity
// desde este módulo (CLAUDE.md — Patrones de arquitectura obligatorios).

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

  const { error } = await getClient().emails.send({
    from,
    to: params.to,
    subject: 'Confirmá tu lugar en la lista de espera de KOA Buds',
    html:
      '<p>Gracias por sumarte a la lista de espera de KOA Buds.</p>' +
      `<p><a href="${params.confirmUrl}">Confirmá tu email acá</a></p>` +
      '<p>Este link expira en 24 horas. Si no fuiste vos, ignorá este mensaje.</p>',
  });

  if (error) {
    // Nunca loguear el payload completo del email ni el token — solo el
    // mensaje de error de Resend (CLAUDE.md — Seguridad: logging).
    throw new Error(`Resend: no se pudo enviar el email de confirmación (${error.name}).`);
  }
}
