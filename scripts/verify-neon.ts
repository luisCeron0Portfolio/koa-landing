import { sql } from '../src/lib/adapters/neon.ts';

// Smoke test de infraestructura (Build 1 — criterio de completitud):
// "Conexión a Neon verificada con una query de prueba (SELECT 1)".
// Requiere DATABASE_URL real en el entorno; no se ejecuta en CI hasta que
// exista un proyecto Neon provisionado (ver tasks/todo.md — bloqueantes).
const result = await sql`SELECT 1 AS ok`;

if (result[0]?.ok !== 1) {
  throw new Error('Conexión a Neon: respuesta inesperada.');
}

console.log('Conexión a Neon verificada: SELECT 1 -> ok');
