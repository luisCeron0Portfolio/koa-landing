import { readdir, readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

// Aplica las migraciones de /migrations en orden alfabético. Requiere
// DATABASE_URL real (ver tasks/todo.md — bloqueante Build 1: proyecto Neon
// aún no provisionado). No usa el adapter de src/lib porque este script corre
// fuera del runtime de la app, antes de que exista ninguna conexión abierta.
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL no está configurada.');
}
const sql = neon(url);

const dir = new URL('../migrations/', import.meta.url);
const files = (await readdir(dir)).filter((f: string) => f.endsWith('.sql')).sort();

// El driver HTTP de Neon ejecuta una sentencia por round-trip (protocolo
// extendido) — no acepta varias sentencias separadas por ';' en una sola
// llamada. Las migraciones de este proyecto no usan ';' dentro de literales,
// así que quitar comentarios de línea completa y separar por ';' es seguro.
function splitStatements(fileContents: string): string[] {
  const withoutComments = fileContents
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  return withoutComments
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

for (const file of files) {
  const contents = await readFile(new URL(file, dir), 'utf-8');
  console.log(`Aplicando ${file}...`);
  for (const statement of splitStatements(contents)) {
    await sql.query(statement);
  }
}

console.log(`Migraciones aplicadas: ${files.length}`);
