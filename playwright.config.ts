import { defineConfig } from '@playwright/test';

// SRS §12: E2E del flujo RF-001→RF-002, rate limit (6to intento → 429),
// honeypot (sin insert). Corre contra `npm run dev` en un puerto dedicado
// para no chocar con un dev server que el desarrollador ya tenga abierto.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4322',
  },
  webServer: {
    // `@astrojs/vercel` no soporta `astro preview` (falla con un error
    // explícito), así que esto tiene que ser `astro dev`. Astro detecta que
    // corre dentro de un agente de IA (paquete `am-i-vibing`) y fuerza modo
    // background por defecto, lo que hace que el proceso padre termine antes
    // de que Playwright confirme el puerto arriba ("exited early").
    // `ASTRO_DEV_BACKGROUND=1` desactiva esa autodetección y lo deja en
    // foreground, que es lo que Playwright necesita.
    command: 'npm run dev -- --port 4322',
    env: { ASTRO_DEV_BACKGROUND: '1' },
    url: 'http://localhost:4322',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
