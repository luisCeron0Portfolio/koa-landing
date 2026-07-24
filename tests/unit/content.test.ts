import { describe, expect, it } from 'vitest';
import { buildWhatsAppUrl } from '../../src/lib/domain/content';

describe('buildWhatsAppUrl (RF-003)', () => {
  it('arma un link wa.me con el mensaje prellenado', () => {
    const url = buildWhatsAppUrl('+573001234567', 'Hola, quiero más info sobre KOA Buds');
    expect(url).toBe(
      'https://wa.me/573001234567?text=Hola%2C%20quiero%20m%C3%A1s%20info%20sobre%20KOA%20Buds',
    );
  });

  it('propaga los UTMs de la sesión si están disponibles', () => {
    const url = buildWhatsAppUrl('+573001234567', 'Hola', {
      source: 'instagram',
      medium: 'cpc',
      campaign: 'lanzamiento',
    });
    expect(url).toContain(encodeURIComponent('(utm: instagram/cpc/lanzamiento)'));
  });

  it('no agrega sufijo de UTM si no hay ninguno disponible', () => {
    const url = buildWhatsAppUrl('+573001234567', 'Hola', {});
    expect(url).not.toContain('utm');
  });
});
