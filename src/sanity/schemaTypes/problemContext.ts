import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'problemContext',
  title: 'Problema / contexto',
  type: 'document',
  fields: [
    defineField({ name: 'heading', title: 'Título', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'body',
      title: 'Texto (2-3 líneas)',
      type: 'text',
      rows: 3,
      validation: (r) => r.required(),
    }),
  ],
});
