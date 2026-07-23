import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity/schemaTypes';

// projectId/dataset reales: [PENDIENTE] — ver tasks/todo.md, bloqueante Build 1.
// El placeholder deja el Studio scaffoldeado y el build funcionando; no conecta
// a un proyecto Sanity real hasta que se configuren las variables de entorno.
const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || 'placeholder';
const dataset = process.env.PUBLIC_SANITY_DATASET || 'production';

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
