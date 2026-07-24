// Lógica de negocio pura (RF-001). Sin HTTP ni DB directa — testeable en
// aislamiento. Los adaptadores de /api son quienes le pasan input crudo y
// actúan sobre el resultado.

export type LeadStatus = 'pending_confirmation' | 'confirmed' | 'unsubscribed';

export interface LeadInput {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  consent?: unknown;
}

export interface NormalizedLead {
  name: string;
  email: string;
  phone: string | null;
  consentTimestamp: string;
  consentTextVersion: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export type ValidationResult =
  { valid: true; lead: NormalizedLead } | { valid: false; errors: ValidationError[] };

// Versión del texto de consentimiento mostrado al usuario (SRS §10). Vive acá
// como constante del servidor, nunca se confía en un valor enviado por el
// cliente para trazabilidad legal (Ley 1581/2012).
export const CONSENT_TEXT_VERSION = 'v1';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_RE = /^\+[1-9]\d{1,14}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateLeadInput(input: LeadInput, now: Date = new Date()): ValidationResult {
  const errors: ValidationError[] = [];

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) {
    errors.push({ field: 'name', message: 'El nombre es requerido.' });
  }

  const rawEmail = typeof input.email === 'string' ? input.email.trim() : '';
  if (!rawEmail) {
    errors.push({ field: 'email', message: 'El email es requerido.' });
  } else if (!EMAIL_RE.test(rawEmail)) {
    errors.push({ field: 'email', message: 'El email no tiene un formato válido.' });
  }

  let phone: string | null = null;
  const hasPhone = input.phone !== undefined && input.phone !== null && input.phone !== '';
  if (hasPhone) {
    const rawPhone = typeof input.phone === 'string' ? input.phone.trim() : '';
    if (!E164_RE.test(rawPhone)) {
      errors.push({ field: 'phone', message: 'El teléfono debe tener formato E.164 (ej. +573001234567).' });
    } else {
      phone = rawPhone;
    }
  }

  if (input.consent !== true) {
    errors.push({ field: 'consent', message: 'Debés aceptar el consentimiento para continuar.' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    lead: {
      name,
      email: normalizeEmail(rawEmail),
      phone,
      consentTimestamp: now.toISOString(),
      consentTextVersion: CONSENT_TEXT_VERSION,
    },
  };
}

// FA-02: honeypot oculto vía CSS (nunca `hidden`, ver SRS §5). Cualquier valor
// no vacío indica un bot completando todos los campos del formulario.
export function isHoneypotTriggered(honeypotValue: unknown): boolean {
  return typeof honeypotValue === 'string' && honeypotValue.length > 0;
}

export type ExistingLeadAction = 'insert' | 'resend_pending' | 'idempotent_confirmed';

// FA-04: confirmado ya existente → 200 idempotente sin duplicar ni reenviar.
// `unsubscribed` no está definido explícitamente en el SRS; se trata igual
// que `pending_confirmation` (permite volver a optar) en vez de bloquear en
// silencio, que sería un comportamiento inventado y peor documentado.
export function decideOnExistingLead(existing: { status: LeadStatus } | null): ExistingLeadAction {
  if (!existing) return 'insert';
  if (existing.status === 'confirmed') return 'idempotent_confirmed';
  return 'resend_pending';
}
