import { createClient } from '@sanity/client';

/**
 * Cliente de lectura de Sanity (contenido editorial). Bounded context
 * separado del cliente de Neon — nunca importar ambos en el mismo módulo
 * de dominio (CLAUDE.md — Patrones de arquitectura obligatorios).
 *
 * Token: siempre read-only en este cliente. El token de escritura (usado
 * solo por Sanity Studio, nunca por el sitio público) vive exclusivamente
 * en la config del Studio, jamás en el bundle de cliente del sitio.
 */
export const sanityClient = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  apiVersion: '2025-01-01',
  useCdn: true,
});
