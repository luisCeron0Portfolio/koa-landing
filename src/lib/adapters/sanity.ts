import { createClient } from '@sanity/client';
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';

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
  // false, no true: este cliente se usa para leer contenido en build time
  // (index.astro). El rebuild ES el mecanismo de refresco de contenido
  // (Build 3: webhook Sanity → Vercel) — usar la CDN acá puede servir una
  // respuesta cacheada de una query idéntica hecha en un build anterior
  // (ej. cuando el dataset todavía estaba vacío), aunque el contenido real
  // ya haya cambiado. Detectado sembrando contenido real y viendo que
  // persistía vacío en dos builds seguidos. La CDN sí tendría sentido para
  // fetches en el navegador o SSR por-request, no acá.
  useCdn: false,
});

const builder = createImageUrlBuilder(sanityClient);

export function urlForImage(source: SanityImageSource) {
  return builder.image(source);
}
