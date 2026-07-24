import { createClient } from '@sanity/client';

// Carga contenido de demo en Sanity (Build 3 / RF-004). Requiere
// SANITY_WRITE_TOKEN real — ver tasks/todo.md (bloqueante). Usa `_id` fijos
// para que correrlo de nuevo actualice en vez de duplicar (createOrReplace).
//
// Contenido explícitamente ficticio (KOA Buds no existe, SRS §1). No incluye
// `footer.whatsappNumber` — ese campo necesita el número de prueba real de
// la agencia (RF-003), que no está disponible en este entorno; no se
// improvisa un número que generaría un link de WhatsApp real funcional.
// Tampoco incluye `gallery` — requiere subir assets de imagen reales.

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_WRITE_TOKEN;

if (!projectId || !dataset) {
  throw new Error('PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET no están configuradas.');
}
if (!token) {
  throw new Error('SANITY_WRITE_TOKEN no está configurada — ver tasks/todo.md (bloqueante de Build 3).');
}

const client = createClient({ projectId, dataset, token, apiVersion: '2025-01-01', useCdn: false });

interface SeedDocument extends Record<string, unknown> {
  _id: string;
  _type: string;
}

const documents: SeedDocument[] = [
  {
    _id: 'seed-hero',
    _type: 'hero',
    productName: 'KOA Buds',
    valueProposition: 'Cancelación de ruido activa que se olvida que existe.',
    ctaLabel: 'Unirme a la lista de espera',
  },
  {
    _id: 'seed-problem-context',
    _type: 'problemContext',
    heading: 'Por qué KOA Buds',
    body: 'Los true wireless de siempre te hacen elegir entre cancelación de ruido y batería. KOA Buds no te hace elegir.',
  },
  {
    _id: 'seed-specs-section',
    _type: 'specsSection',
    heading: 'Especificaciones técnicas',
    items: [
      { _key: 'noise-cancellation', label: 'Cancelación de ruido', value: 'Activa, adaptativa' },
      { _key: 'battery', label: 'Autonomía', value: '8h (32h con estuche)' },
      { _key: 'water-resistance', label: 'Resistencia al agua', value: 'IPX4' },
      { _key: 'connectivity', label: 'Conectividad', value: 'Bluetooth 5.3' },
    ],
  },
  {
    _id: 'seed-testimonial-1',
    _type: 'testimonial',
    quote: 'Desde que los uso no vuelvo a los que tenía antes. La cancelación de ruido es otro nivel.',
    authorName: 'Camila R.',
    authorRole: 'beta tester',
    isFictional: true,
  },
  {
    _id: 'seed-testimonial-2',
    _type: 'testimonial',
    quote: 'Los uso todo el día en la oficina y la batería aguanta perfecto.',
    authorName: 'Andrés M.',
    authorRole: 'beta tester',
    isFictional: true,
  },
  {
    _id: 'seed-faq-1',
    _type: 'faqItem',
    question: '¿Cuándo sale a la venta?',
    answer:
      'Estamos afinando los últimos detalles — el lanzamiento se estima antes de fin de año. Quienes están en la lista de espera se enteran primero.',
    order: 1,
  },
  {
    _id: 'seed-faq-2',
    _type: 'faqItem',
    question: '¿Cuánto va a costar?',
    answer:
      'Todavía no confirmamos el precio final. Va a estar en la franja de audífonos premium true wireless.',
    order: 2,
  },
  {
    _id: 'seed-faq-3',
    _type: 'faqItem',
    question: '¿Son compatibles con Android y iPhone?',
    answer: 'Sí, funcionan con cualquier dispositivo con Bluetooth 5.0 o superior.',
    order: 3,
  },
];

for (const doc of documents) {
  await client.createOrReplace(doc);
  console.log(`Seed: ${doc._id}`);
}

console.log(`Documentos cargados: ${documents.length}`);
console.log(
  'No se cargó `footer` (falta el número real de WhatsApp de prueba de la agencia) ni `gallery` (faltan assets de imagen) — ver tasks/todo.md.',
);
