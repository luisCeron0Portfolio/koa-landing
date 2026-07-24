import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity/schemaTypes';

// Este archivo se bundlea vía Vite para el Studio embebido — acá corresponde
// `import.meta.env`, no `process.env` (que no existe en el bundle de cliente).
// projectId/dataset reales: [PENDIENTE] si no hay .env — ver tasks/todo.md.
const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || 'placeholder';
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';

export default defineConfig({
  name: 'koa-buds-demo',
  title: 'KOA Buds — Demo (contenido editorial)',
  projectId,
  dataset,
  plugins: [structureTool()],
  schema: {
    types: schemaTypes,
  },
});
