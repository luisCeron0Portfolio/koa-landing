import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';

// SRS §12: "Accesibilidad: axe-core en CI, sin errores críticos."
test.describe('Accesibilidad', () => {
  test('la landing no tiene violaciones críticas ni serias de axe-core', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');

    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
});
