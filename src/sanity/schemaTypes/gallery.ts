import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'gallery',
  title: 'Galería',
  type: 'document',
  fields: [
    defineField({
      name: 'images',
      title: 'Imágenes de producto (3-4)',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      validation: (r) => r.required().min(3).max(4),
    }),
  ],
});
