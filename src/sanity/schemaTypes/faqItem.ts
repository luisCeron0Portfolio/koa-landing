import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'faqItem',
  title: 'Pregunta frecuente',
  type: 'document',
  fields: [
    defineField({ name: 'question', title: 'Pregunta', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'answer',
      title: 'Respuesta',
      type: 'text',
      rows: 3,
      validation: (r) => r.required(),
    }),
    defineField({ name: 'order', title: 'Orden', type: 'number', validation: (r) => r.required() }),
  ],
  orderings: [{ title: 'Orden', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
});
