# Lecciones aprendidas

## [2026-07-23] — Versión de Astro y Node: seguridad sobre el pin literal del stack
**Contexto:** Build 1, scaffold inicial. CLAUDE.md especifica "Astro 5.x" y "Node.js 20 LTS".
**Error que se evitó:** Instalar Astro 5.x tal como decía el stack literal habría dejado el proyecto en una versión con 8 CVEs de severidad alta sin parchear (XSS en `define:vars`, slots, spread props, view transitions, SSRF en Host header, etc. — `npm audit`, rango `<=7.0.9`). El fix solo existe desde Astro `7.1.0`, que a su vez requiere Node `>=22.12.0`.
**Consecuencia evitada:** Shippear un framework con XSS conocido y explotable en producción, en el mismo PR que se supone establece la "infraestructura base" segura.
**Corrección:** Se instaló Astro `7.1.3` (última versión con `npm audit` limpio) y se subió el `engines.node` del `package.json` a `>=22.12.0`. El Node 20 LTS mencionado en CLAUDE.md queda desactualizado frente a este requisito real.
**Regla para el futuro:** Cuando un requisito de seguridad no negociable (CLAUDE.md §Seguridad) choque con un pin de versión específico del stack, gana la seguridad — pero se documenta la desviación explícitamente (acá y en `tasks/todo.md`), nunca se decide en silencio. Antes de fijar una versión de un framework, correr `npm audit` con esa versión candidata.
**Tags:** #seguridad #arquitectura

## [2026-07-23] — Vulnerabilidades residuales en tooling de Sanity y del adapter de Vercel
**Contexto:** Build 1, instalación de `sanity`, `@sanity/vision`, `@sanity/astro`, `@astrojs/vercel`.
**Error que se evitó:** Perseguir "0 vulnerabilidades" con `npm audit fix --force` de forma ciega, lo que en este caso proponía downgradear `@astrojs/vercel` a `8.0.4` — versión que exige `astro@^5.0.0` y por lo tanto reintroduce el problema de la lección anterior (Astro <7.1.0 con CVEs de XSS activos), a cambio de resolver un ReDoS en `path-to-regexp` que solo es alcanzable desde herramientas de build, no desde el runtime público.
**Consecuencia evitada:** Cambiar una vulnerabilidad de alto impacto y bajo esfuerzo de explotación (XSS reflejado, alcanzable por cualquier visitante) por una de bajo impacto práctico (ReDoS en una utilidad de routing usada solo en build time) — un mal trade-off de seguridad disfrazado de "audit limpio".
**Corrección:** Se aceptaron 11 vulnerabilidades residuales, todas confinadas a dependencias de tooling (`@sanity/cli`, `@sanity/codegen`, `@sanity/import`, `@sanity/migrate` vía `sanity`; `@vercel/routing-utils` vía `@astrojs/vercel`) que el código de este proyecto nunca invoca en runtime. Documentado como bloqueante de seguimiento en `tasks/todo.md`, no oculto.
**Regla para el futuro:** Antes de forzar un downgrade para "limpiar" `npm audit`, leer qué instala el fix propuesto y evaluar si la nueva versión reintroduce un riesgo mayor al que resuelve. Preferir dejar una vulnerabilidad de bajo impacto y bien documentada, sobre reintroducir una de alto impacto por perseguir un output limpio.
**Tags:** #seguridad #deuda-técnica

## [2026-07-23] — No hay credenciales cloud en este entorno: no se improvisan valores
**Contexto:** Build 1 requiere "Proyecto Vercel creado y linkeado", "Proyecto Neon creado" y "Proyecto Sanity creado".
**Error que se evitó:** Inventar o simular un `projectId` de Sanity, una `DATABASE_URL` de Neon, o marcar el deploy de Vercel como hecho sin haberlo corrido realmente.
**Consecuencia evitada:** Reportar como "completo" una infraestructura que en realidad no existe en ningún proveedor cloud — rompe la confianza del criterio de completitud y oculta trabajo pendiente real.
**Corrección:** Se dejó todo el código, schema, migración y configuración listos para conectar (incluyendo placeholders explícitamente marcados como tales: `projectId: 'placeholder'`), y se documentó el bloqueo de credenciales en `tasks/todo.md` como bloqueante, no como pendiente silencioso.
**Regla para el futuro:** Cuando una tarea de infraestructura requiera una cuenta/token externo que no está disponible en el entorno, no se asume ni se simula el valor — se completa todo el trabajo de código que no depende de la credencial, y se detiene explícitamente ahí.
**Tags:** #arquitectura #deuda-técnica
