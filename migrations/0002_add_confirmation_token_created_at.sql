-- RF-002: cada reenvío de confirmación emite un token nuevo con su propia
-- ventana de 24h. `created_at` de `leads` significa "cuándo se registró el
-- lead" y no debe pisarse en un reenvío — se necesita una columna separada
-- para "cuándo se emitió el token de confirmación activo".
ALTER TABLE leads ADD COLUMN IF NOT EXISTS confirmation_token_created_at timestamptz;
