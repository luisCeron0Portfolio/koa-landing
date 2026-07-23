# Instrucciones para el agente de desarrollo

## Contexto del proyecto
Landing page de pre-lanzamiento para **KOA Buds**, audífonos true wireless con cancelación de ruido activa (caso de estudio ficticio de la agencia). Objetivo único del sitio: captar lista de espera de early adopters tech en Colombia. Es a la vez una demo mostrable a prospectos y la instancia que valida en código real el core reutilizable de "Landing Page" de la agencia.

SRS completo: `docs/SRS-landing-page-koa-buds-completo.md` — leerlo antes de tocar código, especialmente §11 (Build Order).

## Stack tecnológico
- Runtime: Node.js ≥22.12 (requerido por Astro ≥7.1 — ver `tasks/lessons.md` 2026-07-23)
- Framework: Astro 7.x — output estático, adapter de Vercel para funciones serverless
- Lenguaje: TypeScript (strict mode)
- CMS: Sanity Studio v3 (`@sanity/client`)
- DB: Neon (Postgres serverless), acceso con prepared statements
- Email transaccional: Resend
- Rate limit / estado efímero: Upstash Redis (`@upstash/redis`, `@upstash/ratelimit`)
- Anti-bot: Cloudflare Turnstile
- Deploy: Vercel
- Tests: Vitest (unit) + Playwright (E2E)
- Lint: ESLint + Prettier
- CI: GitHub Actions

## Principios de código (adaptados de Linus Torvalds + SRS)
1. Simplicidad primero: si no podés explicarlo en una frase, está mal diseñado.
2. "Buen gusto": eliminá casos especiales reestructurando datos, no acumulando ifs.
3. Nunca rompas un contrato ya publicado (endpoint o campo de datos en producción) sin versión nueva explícita.
4. Practicidad sobre pureza teórica: preferí la solución aburrida y probada, sobre todo en auth, validación y manejo de secrets.
5. El código se explica solo; los comentarios explican el "por qué", nunca el "qué".
6. TDD en el dominio core: el flujo de captación de leads (RF-001/RF-002) lleva tests antes que implementación.
7. Cero código muerto: rama, flag o dependencia sin uso se borra en el mismo PR que la deja huérfana.

## Patrones de arquitectura obligatorios
- Bounded contexts separados: el cliente de Sanity y el cliente de Neon nunca se importan en el mismo módulo de dominio.
- Lógica de negocio (validación de lead, generación/verificación de token) vive en funciones puras testeables sin HTTP ni DB directa. Las funciones de `/api/*` son adaptadores finos.
- Estructura de carpetas:
```
/src
  /pages          → rutas Astro (público)
  /api            → funciones serverless (Vercel)
  /lib/domain     → lógica de negocio pura
  /lib/adapters   → clientes de Sanity, Neon, Resend, Upstash
  /components     → UI
/tests
  /unit
  /e2e
```
- Nunca se llama a Neon ni a Resend directamente desde un componente de página — siempre vía `/api` + `/lib/adapters`.

## Seguridad — reglas no negociables
- Todo input de formulario se revalida server-side, sin excepción.
- Prepared statements en el 100% de las queries a Neon. Cero interpolación de strings en SQL, ni siquiera para valores que "parecen seguros".
- Headers HTTP (`User-Agent`, `Referer`, `X-Forwarded-For`, `Host`, `Cookie`) son input no confiable. `X-Forwarded-For` se lee solo del header inyectado por Vercel, nunca de uno adicional del cliente.
- Token de confirmación de email: guardado hasheado (SHA-256 mínimo), nunca en claro.
- Rate limit de `/api/waitlist`: 5 intentos/10min por IP hasheada → 429, verificado con Upstash antes de tocar la DB.
- Token de Sanity en build público: siempre read-only. Token de escritura solo en variables de entorno server-side, nunca en bundle de cliente.
- CSP con las directivas exactas del SRS §5 — no se marca como hecho si están incompletas.
- Nunca loguear: token en claro, payload completo del formulario, contenido de cookies.
- Si un requisito de seguridad del SRS no se puede implementar tal cual, no se omite en silencio: se marca `// SECURITY-GAP:` con la razón y se agrega a `tasks/todo.md` como bloqueante.

## Gestión de tareas
- Al empezar una sesión: leer `tasks/todo.md` (plan activo) y `tasks/lessons.md` (errores ya documentados) antes de escribir código.
- Al cerrar una sesión: marcar completado en `tasks/todo.md`, agregar bloqueantes si los hay, documentar en `tasks/lessons.md` cualquier corrección o decisión no trivial.

## Workflow de desarrollo
- Seguir el Build Order del SRS (§11) en orden — no arrancar un Build sin que el anterior esté verificado end-to-end.
- Definición de Done: criterio de aceptación del RF cumplido + test que lo verifica + sin secrets expuestos + sin vulnerabilidad conocida introducida.
- Un `[PENDIENTE]` del SRS que bloquea una tarea puntual no se improvisa: se detiene esa tarea, se documenta como bloqueante en `tasks/todo.md`, y se sigue con lo que no dependa de eso.

## Comandos del entorno
- Tests: `npm run test` / `npm run test:e2e`
- Lint: `npm run lint`
- Build: `npm run build`
- CI: GitHub Actions — lint + tests + `npm audit` + secrets scan (gitleaks) en cada PR

## Límites y claridad
- No se toca configuración de producción (dominios, DNS, variables de entorno en Vercel) sin confirmación explícita.
- No se agregan dependencias nuevas sin justificar en el PR qué problema resuelven y por qué el stack actual no alcanza.
- Datos de prueba nunca parecen reales sin marcarse explícitamente como ficticios (en el dato o en un seed script separado del código de producción).