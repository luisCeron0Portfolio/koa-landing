-- Migración inicial: tabla `leads` (SRS §6 — Modelo de datos)
-- Bounded context: este store es exclusivo de datos transaccionales (Neon).
-- Nunca se mezcla con el content store editorial de Sanity.

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'pending_confirmation'
    CHECK (status IN ('pending_confirmation', 'confirmed', 'unsubscribed')),
  confirmation_token_hash text,
  consent_timestamp timestamptz NOT NULL,
  consent_text_version text NOT NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

-- email normalizado en lowercase antes del insert (capa de dominio, RF-001);
-- el índice único aquí es la garantía de última línea contra duplicados.
CREATE UNIQUE INDEX IF NOT EXISTS leads_email_idx ON leads (email);

-- Tabla separada para IP hasheada: retención de 30 días, aislada de la PII
-- de contacto (nombre/email/teléfono) que vive en `leads` con retención propia.
CREATE TABLE IF NOT EXISTS lead_ip_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_ip_hashes_lead_id_idx ON lead_ip_hashes (lead_id);
