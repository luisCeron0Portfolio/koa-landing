import type { APIContext } from 'astro';
import { sql } from '../../lib/adapters/neon';
import { WAITLIST_COUNT_CACHE_SECONDS } from '../../lib/domain/social-proof';

// RF-006: solo cuenta leads `confirmed` (double opt-in real) — evita que
// spam/bots que pasan el honeypot pero nunca confirman infle el número.
export const prerender = false;

export async function GET(_context: APIContext): Promise<Response> {
  const rows = (await sql`SELECT COUNT(*)::int AS count FROM leads WHERE status = 'confirmed'`) as {
    count: number;
  }[];
  const count = rows[0]?.count ?? 0;

  return new Response(JSON.stringify({ count }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // s-maxage cachea en el edge de Vercel — ningún visitante dispara una
      // query nueva a Neon dentro de la ventana de 15 min (SRS §5, RF-006).
      'Cache-Control': `public, s-maxage=${WAITLIST_COUNT_CACHE_SECONDS}, stale-while-revalidate=${WAITLIST_COUNT_CACHE_SECONDS * 2}`,
    },
  });
}
