// RF-006: el criterio de aceptación es que el valor mostrado nunca refleje
// el conteo INSTANTÁNEO — se logra cacheando la respuesta (ver
// src/pages/api/waitlist-count.ts), no ofuscando el número en sí.
export const WAITLIST_COUNT_CACHE_SECONDS = 15 * 60;

export function formatWaitlistCount(count: number): string {
  const safeCount = Math.max(0, Math.trunc(count));
  return `+${safeCount} personas en la lista de espera`;
}
