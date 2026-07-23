import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'specItem',
  title: 'Especificación técnica',
  type: 'object',
  fields: [
    defineField({ name: 'label', title: 'Etiqueta', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'value', title: 'Valor', type: 'string', validation: (r) => r.required() }),
  ],
});
