// Tipos del contenido editorial (SRS §9). Puramente estructurales — sin
// lógica; viven en /domain porque tanto páginas como componentes los usan
// y no pertenecen a ningún adapter específico.

export interface SanityImageRef {
  _type: 'image';
  asset: { _ref: string; _type: 'reference' };
}

export interface HeroContent {
  productName: string;
  valueProposition: string;
  ctaLabel: string;
  productImage?: SanityImageRef;
}

export interface ProblemContextContent {
  heading: string;
  body: string;
}

export interface SpecItem {
  label: string;
  value: string;
}

export interface SpecsSectionContent {
  heading: string;
  items: SpecItem[];
}

export interface GalleryContent {
  images: SanityImageRef[];
}

export interface TestimonialContent {
  quote: string;
  authorName: string;
  authorRole?: string;
  isFictional: boolean;
}

export interface FaqItemContent {
  question: string;
  answer: string;
  order: number;
}

export interface FooterContent {
  whatsappNumber?: string;
  whatsappMessage?: string;
  socialLinks?: { platform: string; url: string }[];
}

// Contacto real de Elevaforge (la agencia detrás de este caso de estudio
// ficticio) — distinto del `whatsappNumber` de FooterContent, que viene de
// Sanity y es "de prueba" para consultas sobre KOA Buds (RF-003). Número y
// dominio confirmados explícitamente por el dueño del proyecto, no
// inventados. Centralizado acá porque lo usan tanto el email de confirmación
// (server) como el CTA de WhatsApp del formulario (cliente).
export const ELEVAFORGE_URL = 'https://elevaforge.com';
export const ELEVAFORGE_WHATSAPP_NUMBER = '+573150812166';

// RF-003: mensaje prellenado con UTMs de la sesión propagados si están
// disponibles.
export function buildWhatsAppUrl(
  whatsappNumber: string,
  message: string,
  utm: { source?: string | null; medium?: string | null; campaign?: string | null } = {},
): string {
  const utmSuffix = [utm.source, utm.medium, utm.campaign].filter(Boolean).length
    ? ` (utm: ${[utm.source, utm.medium, utm.campaign].filter(Boolean).join('/')})`
    : '';
  const digits = whatsappNumber.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message + utmSuffix)}`;
}
