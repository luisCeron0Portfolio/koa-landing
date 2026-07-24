// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import vercel from '@astrojs/vercel';

import react from '@astrojs/react';

import sanity from '@sanity/astro';

// astro.config.mjs corre en Node plano, antes de que exista contexto de Vite:
// `process.env` acá NO carga .env automáticamente. `loadEnv` sí lo hace.
const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');

// projectId/dataset reales: [PENDIENTE] si no hay .env — ver tasks/todo.md.
const SANITY_PROJECT_ID = env.PUBLIC_SANITY_PROJECT_ID || 'placeholder';
const SANITY_DATASET = env.PUBLIC_SANITY_DATASET || 'production';

// https://astro.build/config
export default defineConfig({
  adapter: vercel(),
  integrations: [
    react(),
    sanity({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      useCdn: true,
      studioBasePath: '/studio',
    }),
  ],
  security: {
    // CSP del SRS §5. Dos desviaciones deliberadas del texto literal,
    // documentadas también en tasks/todo.md (SECURITY-GAP):
    //
    // 1. Nonce → hash: el SRS pide 'nonce-${NONCE}', pero este sitio es
    //    estático (prerenderizado en build, SRS §7). Un nonce solo tiene
    //    sentido en HTML renderizado por request — en una página estática
    //    serían siempre el mismo valor fijo, lo cual no aporta seguridad real
    //    y de hecho sería peor que no tener nonce (falsa sensación de
    //    protección). El mecanismo correcto para contenido estático es hash
    //    SHA-256 del script/estilo exacto, que es lo que Astro calcula acá
    //    automáticamente para cada script/estilo que él mismo empaqueta
    //    (incluido el bootstrap de hidratación del island de React).
    // 2. script-src agrega challenges.cloudflare.com, no listado en el SRS:
    //    sin este origen, el script de Cloudflare Turnstile (mandado por
    //    RF-001) queda bloqueado por el propio CSP que se supone protege el
    //    mismo formulario. El SRS sí lista ese origen en frame-src/connect-src
    //    pero lo omite en script-src — se corrige acá, no en silencio.
    // 3. script-src agrega 'self': sin esto, los propios chunks JS que Astro
    //    empaqueta para hidratar el island de React (WaitlistForm) quedan
    //    bloqueados — el hash automático solo cubre <script> INLINE, no los
    //    <script type="module" src="..."> externos que carga el runtime de
    //    hidratación. Detectado corriendo Lighthouse de verdad en un
    //    navegador (nunca antes probado — solo se había verificado la API
    //    con `curl`, que no ejecuta CSP). Ver tasks/lessons.md.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' https://cdn.sanity.io data:",
        "connect-src 'self' https://api.sanity.io https://www.google-analytics.com https://challenges.cloudflare.com",
        'frame-src https://www.googletagmanager.com https://challenges.cloudflare.com',
        "base-uri 'self'",
        "form-action 'self'",
      ],
      scriptDirective: {
        resources: ["'self'", 'https://www.googletagmanager.com', 'https://challenges.cloudflare.com'],
      },
    },
  },
});
