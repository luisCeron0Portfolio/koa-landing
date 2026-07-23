import { neon } from '@neondatabase/serverless';

/**
 * Cliente de Neon. Bounded context de datos transaccionales (PII de leads).
 * Nunca importar este módulo junto al cliente de Sanity en el mismo módulo
 * de dominio (CLAUDE.md — Patrones de arquitectura obligatorios).
 *
 * Uso: siempre como prepared statement vía template tag —
 *   sql`SELECT * FROM leads WHERE email = ${email}`
 * Nunca interpolar strings directamente en la query.
 */
function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL no está configurada.');
  }
  return url;
}

export const sql = neon(getConnectionString());
