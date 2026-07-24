import { describe, expect, it } from 'vitest';
import {
  CONSENT_TEXT_VERSION,
  decideOnExistingLead,
  isHoneypotTriggered,
  normalizeEmail,
  validateLeadInput,
} from '../../src/lib/domain/lead';

describe('normalizeEmail', () => {
  it('pasa a lowercase y recorta espacios', () => {
    expect(normalizeEmail('  Nombre@Ejemplo.COM  ')).toBe('nombre@ejemplo.com');
  });
});

describe('validateLeadInput', () => {
  const now = new Date('2026-07-23T12:00:00.000Z');
  const validInput = {
    name: 'Ada Lovelace',
    email: 'ADA@Ejemplo.com',
    phone: '+573001234567',
    consent: true,
  };

  it('acepta un input válido y normaliza los campos', () => {
    const result = validateLeadInput(validInput, now);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.lead).toEqual({
        name: 'Ada Lovelace',
        email: 'ada@ejemplo.com',
        phone: '+573001234567',
        consentTimestamp: '2026-07-23T12:00:00.000Z',
        consentTextVersion: CONSENT_TEXT_VERSION,
      });
    }
  });

  it('acepta sin teléfono (opcional)', () => {
    const result = validateLeadInput({ ...validInput, phone: undefined }, now);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.lead.phone).toBeNull();
    }
  });

  it('rechaza nombre vacío con field=name (FA-01)', () => {
    const result = validateLeadInput({ ...validInput, name: '  ' }, now);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContainEqual({ field: 'name', message: expect.any(String) });
    }
  });

  it('rechaza email vacío con field=email (FA-01)', () => {
    const result = validateLeadInput({ ...validInput, email: '' }, now);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContainEqual({ field: 'email', message: expect.any(String) });
    }
  });

  it('rechaza email con formato inválido', () => {
    const result = validateLeadInput({ ...validInput, email: 'no-es-un-email' }, now);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.field === 'email')).toBe(true);
    }
  });

  it('rechaza teléfono que no es E.164', () => {
    const result = validateLeadInput({ ...validInput, phone: '3001234567' }, now);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.field === 'phone')).toBe(true);
    }
  });

  it('rechaza consentimiento no marcado (checkbox no premarcado, Ley 1581/2012)', () => {
    const result = validateLeadInput({ ...validInput, consent: false }, now);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContainEqual({ field: 'consent', message: expect.any(String) });
    }
  });

  it('acumula todos los errores en un solo request (no se detiene en el primero)', () => {
    const result = validateLeadInput({ name: '', email: '', phone: '123', consent: false }, now);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      const fields = result.errors.map((e) => e.field).sort();
      expect(fields).toEqual(['consent', 'email', 'name', 'phone']);
    }
  });

  it('no confía en tipos inesperados (number, object) como si fueran string/boolean', () => {
    const result = validateLeadInput({ name: 123, email: {}, phone: [], consent: 'true' } as never, now);
    expect(result.valid).toBe(false);
  });
});

describe('isHoneypotTriggered (FA-02)', () => {
  it('detecta el honeypot lleno', () => {
    expect(isHoneypotTriggered('cualquier-valor')).toBe(true);
  });

  it('no dispara con honeypot vacío o ausente', () => {
    expect(isHoneypotTriggered('')).toBe(false);
    expect(isHoneypotTriggered(undefined)).toBe(false);
  });
});

describe('decideOnExistingLead (FA-04)', () => {
  it('inserta si no existe el lead', () => {
    expect(decideOnExistingLead(null)).toBe('insert');
  });

  it('es idempotente si ya está confirmado (200 sin duplicar ni reenviar)', () => {
    expect(decideOnExistingLead({ status: 'confirmed' })).toBe('idempotent_confirmed');
  });

  it('reenvía confirmación si sigue pending_confirmation', () => {
    expect(decideOnExistingLead({ status: 'pending_confirmation' })).toBe('resend_pending');
  });
});
