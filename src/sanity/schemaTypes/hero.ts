import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'hero',
  title: 'Hero',
  type: 'document',
  fields: [
    defineField({ name: 'productName', title: 'Nombre del producto', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'valueProposition', title: 'Propuesta de valor (una línea)', type: 'string', validation: (r) => r.required().max(140) }),
    defineField({ name: 'ctaLabel', title: 'Texto del CTA principal', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'productImage', title: 'Imagen / mockup del producto', type: 'image', options: { hotspot: true } }),
  ],
});
