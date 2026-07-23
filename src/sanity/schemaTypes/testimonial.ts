import { defineField, defineType } from 'sanity';

// Contenido ficticio (SRS §9): citas de "beta testers" — el producto no existe.
// Marcar explícitamente en el campo `isFictional` para que quede trazado en el
// contenido mismo, no solo en un comentario de código.
export default defineType({
  name: 'testimonial',
  title: 'Testimonio',
  type: 'document',
  fields: [
    defineField({ name: 'quote', title: 'Cita', type: 'text', rows: 3, validation: (r) => r.required() }),
    defineField({ name: 'authorName', title: 'Nombre del autor', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'authorRole', title: 'Rol / contexto del autor', type: 'string' }),
    defineField({
      name: 'isFictional',
      title: '¿Contenido ficticio?',
      type: 'boolean',
      initialValue: true,
      readOnly: true,
      description: 'Siempre true en esta demo — KOA Buds es un caso de estudio ficticio.',
    }),
  ],
});
