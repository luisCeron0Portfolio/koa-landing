import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'specsSection',
  title: 'Especificaciones técnicas',
  type: 'document',
  fields: [
    defineField({
      name: 'heading',
      title: 'Título de la sección',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'items',
      title: 'Especificaciones',
      type: 'array',
      of: [{ type: 'specItem' }],
      validation: (r) => r.required().min(1),
    }),
  ],
});
