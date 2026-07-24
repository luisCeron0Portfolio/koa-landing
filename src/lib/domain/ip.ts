import { createHmac } from 'node:crypto';

// HMAC en vez de SHA-256 plano: el espacio de IPv4 (~4 mil millones) es
// trivialmente reversible por fuerza bruta con un hash sin secreto. El pepper
// vive solo en el servidor (IP_HASH_PEPPER), nunca en el bundle de cliente.
export function hashIp(ip: string, pepper: string): string {
  return createHmac('sha256', pepper).update(ip).digest('hex');
}
