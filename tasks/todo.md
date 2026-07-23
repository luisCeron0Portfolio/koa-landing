# Plan activo: Build 1 — Infraestructura base (KOA Buds demo)
**Inicio:** 2026-07-23
**Cierre (parcial):** 2026-07-23
**Objetivo:** Proyecto desplegable en Vercel con conexión verificada a Neon y Sanity Studio operativo, listo para recibir el flujo de captación (Build 2).

## Fase 1: Infraestructura base
- [x] Scaffold de Astro (`npm create astro@latest`) con TypeScript strict — `astro check` 0 errores
- [ ] Proyecto Vercel creado y linkeado — **bloqueado**, ver bloqueantes
- [x] Adapter de Astro para Vercel configurado (`@astrojs/vercel@11.0.3`, output estático + `/api` on-demand)
- [ ] Proyecto Neon creado — **bloqueado**, ver bloqueantes
- [x] Migración de tabla `leads` escrita según modelo de datos del SRS §6 (`migrations/0001_create_leads.sql`) — pendiente de aplicar contra una instancia real
- [ ] Proyecto Sanity creado — **bloqueado**, ver bloqueantes
- [x] Schema de contenido definido (hero, problema/contexto, specs, galería, testimonios, FAQ, footer) según SRS §9 — `src/sanity/schemaTypes/`, Studio embebido en `/studio` vía `@sanity/astro`
- [x] `.env.example` completo con todas las variables (Sanity, Neon, Resend, Upstash, Turnstile) sin valores reales
- [x] Deploy inicial en Vercel muestra placeholder — smoke test del pipeline completo: **el build local (`npm run build`) genera correctamente `/` y `/studio` con el adapter de Vercel**; el deploy real a Vercel queda bloqueado por falta de cuenta/token (ver bloqueantes)

## Bloqueantes conocidos
- **[BLOQUEANTE — credenciales cloud]** No hay acceso a cuentas/tokens de Vercel, Neon ni Sanity en este entorno (sin login interactivo, sin API tokens en variables de entorno). No se pudo:
  - Crear ni linkear un proyecto Vercel real, ni correr un deploy real (`vercel deploy`).
  - Crear un proyecto Neon real ni correr `npm run db:migrate` / `npm run db:check` contra una base real.
  - Crear un proyecto Sanity real (projectId/dataset son placeholders en `astro.config.mjs` y `sanity.config.ts`, marcados explícitamente como tal).
  - **Acción requerida del usuario:** proveer `DATABASE_URL` (Neon), `PUBLIC_SANITY_PROJECT_ID`/`PUBLIC_SANITY_DATASET` (+ token de escritura del Studio) y credenciales de Vercel (o correr `vercel link` localmente). Con eso: `npm run db:migrate` aplica la migración, `npm run db:check` verifica la conexión, y un deploy real de Vercel completa el smoke test de punta a punta.
  - No bloquea el resto de Build 1: todo el código, schema y configuración están listos para conectarse en cuanto existan las credenciales.

- **[BLOQUEANTE — seguimiento, no bloquea Build 1]** `npm audit` reporta 11 vulnerabilidades (4 moderate, 7 high) confinadas a herramientas de build/CLI, no al runtime que sirve al público:
  - `sanity` (paquete) bundlea `@sanity/cli`/`@sanity/runtime-cli`/`@sanity/codegen`/`@sanity/import`/`@sanity/migrate`, que dependen de versiones vulnerables de `adm-zip`, `js-yaml` y `uuid` (vía `typeid-js`). Estas herramientas no se invocan desde el sitio público ni desde el Studio embebido en runtime (solo desde la CLI de Sanity, que este proyecto no usa).
  - `@astrojs/vercel@11.0.3` depende de `@vercel/routing-utils` → `path-to-regexp` vulnerable (ReDoS). El único fix es downgradear a `@astrojs/vercel@8.0.4`, que requiere Astro `^5.0.0` y rompe con Astro `7.1.3` (nuestra versión actual, elegida por seguridad — ver `tasks/lessons.md`).
  - **Acción requerida:** revisar en cada actualización de dependencias si upstream (Sanity, Vercel) publicó parches; hasta entonces, si el CI de GitHub Actions (`npm audit` no-opcional) bloquea el pipeline, agregar una excepción documentada y con fecha de revisión (no silenciar sin justificación).

- `[PENDIENTE]` Dominio real de la agencia — necesario antes de Build 4 (Resend + analítica), no bloquea Build 1.
- `[PENDIENTE]` Copy final de contenido — no bloquea infraestructura, se usa placeholder en Sanity mientras tanto.
- `[PENDIENTE]` Validación legal del plazo de retención de datos (propuesto: 12 meses) — no bloquea Build 1, sí debe resolverse antes de Build 2 (afecta el job de purga).

## Criterios de completitud
- [x] `npm run build` pasa sin errores
- [ ] Conexión a Neon verificada con una query de prueba (`SELECT 1`) — script listo (`npm run db:check`), **bloqueado por falta de `DATABASE_URL` real**
- [ ] Sanity Studio accesible en `/studio` con schema cargado — **el schema carga y el Studio renderiza en build local**; verificación contra un proyecto Sanity real bloqueada por falta de `projectId`/`dataset` reales
- [x] No hay secrets commiteados (gitleaks limpio) — verificado con `gitleaks detect --source . --no-git` (0 leaks sobre archivos versionables; los 2 falsos positivos de entropía encontrados estaban solo en `dist/`/`.vercel/`, ambos gitignored)

## Revisión
Build 1 queda **funcionalmente completo en código** (scaffold, estructura de carpetas, adapters, migración SQL, schema de Sanity, `.env.example`, build limpio, gitleaks limpio). Los tres criterios que requieren un proyecto cloud real (Vercel/Neon/Sanity) quedan bloqueados por falta de credenciales en este entorno — documentado arriba, no improvisado. Al recibir las credenciales, los pasos restantes son mecánicos: `vercel link` + deploy, `npm run db:migrate` + `npm run db:check`, y configurar `PUBLIC_SANITY_PROJECT_ID`/`PUBLIC_SANITY_DATASET` reales.

No avanzar a Build 2 hasta resolver el bloqueante de credenciales cloud y correr la verificación end-to-end real.
