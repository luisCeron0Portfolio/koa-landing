import { defineField, defineType } from 'sanity';

// Número de WhatsApp de prueba de la agencia — nunca un número real de cliente
// (RF-003, SRS §8). Marcado explícitamente en la descripción del campo.
export default defineType({
  name: 'footer',
  title: 'Footer',
  type: 'document',
  fields: [
    defineField({
      name: 'whatsappNumber',
      title: 'Número de WhatsApp (E.164, demo)',
      type: 'string',
      description: 'Número de prueba de la agencia. Nunca el número real de un cliente.',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'whatsappMessage', title: 'Mensaje prellenado', type: 'string', initialValue: 'Hola, quiero más info sobre KOA Buds' }),
    defineField({
      name: 'socialLinks',
      title: 'Redes sociales (placeholder)',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'platform', type: 'string', title: 'Plataforma' },
            { name: 'url', type: 'url', title: 'URL' },
          ],
        },
      ],
    }),
  ],
});
