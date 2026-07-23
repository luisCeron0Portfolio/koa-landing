// @ts-check
import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';

import react from '@astrojs/react';

import sanity from '@sanity/astro';

// projectId/dataset reales: [PENDIENTE] — ver tasks/todo.md, bloqueante Build 1.
const SANITY_PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID || 'placeholder';
const SANITY_DATASET = process.env.PUBLIC_SANITY_DATASET || 'production';

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
});