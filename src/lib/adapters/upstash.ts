import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Bounded context: solo rate limiting / estado efímero. Cero PII — la única
// clave que entra acá es el IP hasheado (ver src/lib/domain/ip.ts), nunca la
// IP en claro ni datos del formulario.

let ratelimit: Ratelimit | undefined;

function getRatelimit(): Ratelimit {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN no están configuradas.');
  }

  // SRS §5: 5 intentos / 10 min por IP (hash), 429 al superarlo.
  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    prefix: 'waitlist-rate-limit',
  });
  return ratelimit;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function checkWaitlistRateLimit(ipHash: string): Promise<RateLimitResult> {
  const { success, reset } = await getRatelimit().limit(ipHash);
  return {
    allowed: success,
    retryAfterSeconds: Math.max(0, Math.ceil((reset - Date.now()) / 1000)),
  };
}
