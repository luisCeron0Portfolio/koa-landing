// Bounded context: solo verificación anti-bot. No importa Neon/Sanity/Resend.

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileResponse {
  success: boolean;
}

export async function verifyTurnstileToken(token: string, remoteIp: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new Error('TURNSTILE_SECRET_KEY no está configurada.');
  }

  const body = new URLSearchParams({ secret, response: token, remoteip: remoteIp });
  const response = await fetch(VERIFY_URL, { method: 'POST', body });
  const data = (await response.json()) as TurnstileResponse;
  return data.success === true;
}
