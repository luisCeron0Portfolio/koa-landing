# SRS — Landing Page: KOA Buds (Demo completa — técnico + instancia)
**Versión:** 0.2
**Fecha:** 2026-07-24
**Autor:** [Usuario] | **Revisor técnico:** Arch-Sentinel
**Estado:** Builds 1-3 y 5 implementados y verificados; Build 4 parcial (ver §11)

> **Nota de procedencia:** este documento es una instancia autocontenida, derivada de `SRS-landing-page-core.md` v0.1. El core sigue siendo la fuente de verdad del template reutilizable para futuros proyectos de la agencia. Si el core cambia, este documento no se actualiza automáticamente — es un snapshot de la demo KOA Buds en este punto en el tiempo.

---

## 1. Resumen ejecutivo

Landing page de pre-lanzamiento para **KOA Buds**, audífonos true wireless con cancelación de ruido activa (marca y producto ficticios, caso de estudio interno de la agencia). Objetivo único: captar lista de espera de early adopters tech en Colombia antes del lanzamiento comercial. Sirve como demo mostrable a prospectos, y a la vez valida en código real el catálogo de capacidades que la agencia ofrece bajo el producto "Landing Page".

**Fuera de la lente de este documento:** pasarela de pago, CRM real, multi-idioma — no aplican a esta instancia.

---

## 2. Stakeholders y usuarios

| Rol | Necesidad principal | Criterio de éxito |
|-----|--------------------|--------------------|
| Cliente ficticio "KOA" | Captar leads sin fricción técnica | Puede editar contenido sin pedir ayuda al developer |
| Visitante / lead potencial | Entender la oferta y actuar rápido | Completa la acción en < 3 interacciones |
| Equipo de la agencia | Tener una demo mostrable y un patrón clonable | Demo funcional + core validado en producción real |
| Prospecto de la agencia (viendo la demo) | Evaluar la capacidad técnica de la agencia | Ve el flujo completo funcionando en vivo, incluida edición de contenido |

---

## 3. Alcance

**En scope:**
- Formulario de captación de waitlist (nombre, email, teléfono opcional)
- Confirmación por email (double opt-in)
- CTA a WhatsApp (click-to-chat)
- CMS de contenido editorial para el "cliente" (hero, specs, galería, testimonios, FAQ)
- Analítica de campaña (GA4 + Meta Pixel vía GTM)
- Social proof dinámico (contador cacheado)

**Fuera de scope (explícito):**
- Pasarela de pago / checkout — es waitlist, no pre-venta
- CRM propio o externo real — no aplica a un caso ficticio
- Multi-idioma — solo español/Colombia
- App móvil o integración con hardware real — el producto no existe
- Panel multi-tenant — este es un repo independiente, no una plataforma compartida

---

## 4. Requisitos funcionales

### RF-001: Captación de lead
- **Descripción:** Formulario con nombre y email (teléfono opcional para habilitar contacto por WhatsApp).
- **Actores:** Visitante anónimo.
- **Precondiciones:** Ninguna — endpoint público.
- **Flujo principal:**
  1. Visitante completa el formulario.
  2. Client-side valida formato (UX, no seguridad).
  3. Server-side revalida todo — única fuente de verdad de validación.
  4. Honeypot vacío + Cloudflare Turnstile pasa.
  5. Rate limit por IP no excedido.
  6. Registro insertado en tabla `leads` (Neon, prepared statement), estado `pending_confirmation`.
  7. Email de confirmación disparado (RF-002).
- **Flujos alternativos:**
  - FA-01: Campo requerido vacío → 400, `field` identifica cuál.
  - FA-02: Honeypot lleno → 200 falso-positivo silencioso, sin insert.
  - FA-03: Rate limit excedido → 429 con `retry_after`.
  - FA-04: Email ya registrado y confirmado → 200 idempotente, sin duplicar ni reenviar.
- **Postcondiciones:** Registro en `pending_confirmation` o rechazo explícito.
- **Criterios de aceptación:** Un envío legítimo siempre resulta en `pending_confirmation` + email disparado; un envío con honeypot lleno nunca inserta registro.

### RF-002: Confirmación por email (double opt-in)
- **Descripción:** Email con link de confirmación de un solo uso, expira en 24h.
- **Flujo principal:**
  1. Token aleatorio generado, hasheado antes de guardar.
  2. Email enviado vía Resend con link `/confirmar?token=...`.
  3. Click valida hash + expiración.
  4. Estado pasa a `confirmed`, `confirmed_at` se registra.
- **Flujos alternativos:**
  - FA-01: Token expirado → página con opción de reenviar.
  - FA-02: Token inválido/ya usado → 404 genérico, sin filtrar la causa.
- **Criterios de aceptación:** Ningún lead en `confirmed` sin click verificado del token.

### RF-003: CTA WhatsApp
- **Descripción:** Botón con link `wa.me`, mensaje prellenado: *"Hola, quiero más info sobre KOA Buds"*. Número de prueba de la agencia, no un número real de cliente.
- **Criterios de aceptación:** Click abre WhatsApp con el mensaje y UTMs de la sesión propagados si están disponibles.

### RF-004: CMS de contenido editorial
- **Descripción:** Bloques editables sin tocar código: hero, especificaciones, galería, testimonios, FAQ.
- **Actores:** Editor del "cliente", autenticado vía Sanity (nunca auth propia construida a mano).
- **Criterios de aceptación:** Publicar un cambio en Sanity Studio se refleja en producción en < 2 minutos, sin intervención de developer. Debe poder demostrarse en vivo durante una reunión de venta.

### RF-005: Analítica de campaña
- **Descripción:** GA4 + Meta Pixel cargados vía GTM, en propiedades/cuentas de test — nunca mezcladas con datos de producción de un cliente real.
- **Criterios de aceptación:** Evento de conversión visible en GA4 DebugView y Meta Pixel Helper al completar RF-001.

### RF-006: Social proof dinámico
- **Descripción:** Contador "+X personas en la lista de espera", cacheado con delay ≥ 15 minutos.
- **Criterios de aceptación:** El valor mostrado nunca refleja el conteo exacto instantáneo — evita exponer la velocidad real de crecimiento de la campaña.

---

## 5. Requisitos no funcionales

### Rendimiento
- LCP < 2.5s p75 (Lighthouse CI, simulación 4G)
- INP < 200ms
- CLS < 0.1
- Medido en cada PR — regresión bloquea merge

### Disponibilidad
- SLA objetivo: 99.5%
- RTO: 4 horas
- RPO: 24 horas para contenido editorial; **0 para confirmaciones ya procesadas** (point-in-time recovery de Neon)

### Seguridad

**Autenticación:** ninguna en el sitio público. Único punto autenticado: CMS (Sanity), delegado al proveedor.

**Autorización:** N/A en sitio público. En el CMS: modelo de roles del proveedor.

**Validación de input (no negociable):**
- Todo input se revalida server-side, sin excepción.
- Headers HTTP (`User-Agent`, `Referer`, `X-Forwarded-For`, `Host`, `Cookie`) son input no confiable: nunca se concatenan en queries ni se usan para lógica de autorización. `X-Forwarded-For` se lee solo desde la capa de confianza de Vercel, nunca del cliente.
- Todo insert a `leads` usa prepared statements, incluidos campos derivados de headers.

**Rate limiting:**
```
Endpoint: POST /api/waitlist
- 5 intentos / 10 min por IP (hash, no IP en claro) → 429
- Honeypot: campo oculto vía CSS, no vía atributo `hidden`
- Anti-bot: Cloudflare Turnstile
```

**CSP (directivas concretas):**
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-${NONCE}' https://www.googletagmanager.com;
  style-src 'self' 'nonce-${NONCE}';
  img-src 'self' https://cdn.sanity.io data:;
  connect-src 'self' https://api.sanity.io https://www.google-analytics.com https://challenges.cloudflare.com;
  frame-src https://www.googletagmanager.com https://challenges.cloudflare.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self'
```

**Headers adicionales:** HSTS (`max-age=63072000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

**Datos sensibles identificados:** nombre, email, teléfono. IP nunca en claro — hasheada, retención separada de 30 días solo para investigación de abuso.

**Compliance:** Ley 1581/2012 (Habeas Data, Colombia). Consentimiento explícito con checkbox no premarcado, versión de texto registrada junto al lead.

**Logging de seguridad:**
- Se registra: intentos de submit (éxito/fallo), bloqueos por rate limit (ip_hash, timestamp), errores 5xx (endpoint, sin payload de usuario).
- Nunca se registra: token de confirmación en claro, payload completo del formulario.
- Formato: JSON estructurado, timestamp ISO 8601, nivel info/warn/error.

**Secrets:** token de Sanity (read-only en build, write-only server-side), API key de Resend, credenciales de Neon y Upstash — variables de entorno en Vercel, nunca en el repo. Secrets scanning en pre-commit y CI.

---

## 6. Modelo de datos — entidad `lead`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| name | text | requerido |
| email | text | normalizado lowercase, índice único |
| phone | text, nullable | E.164 si presente |
| status | enum | `pending_confirmation` \| `confirmed` \| `unsubscribed` |
| confirmation_token_hash | text | hash del token, nunca el token en claro |
| consent_timestamp | timestamptz | requerido, no nulo |
| consent_text_version | text | trazabilidad de qué texto aceptó |
| utm_source, utm_medium, utm_campaign | text, nullable | atribución de campaña |
| ip_hash | text | hash, retención 30 días, tabla separada |
| created_at, confirmed_at | timestamptz | |

**Bounded context:** este store (Neon, PII transaccional) es distinto del content store de Sanity (contenido editorial público). No se mezclan.

---

## 7. Arquitectura

**Stack:**
- **Frontend/SSG:** Astro
- **CMS:** Sanity (Studio v3)
- **Datos transaccionales:** Neon (Postgres serverless), tabla `leads`
- **Hosting/Deploy:** Vercel (Astro adapter + funciones serverless en `/api/*`)
- **Email transaccional:** Resend
- **Rate limiting / estado efímero:** Upstash Redis
- **Anti-bot:** Cloudflare Turnstile
- **Analítica:** GTM → GA4 + Meta Pixel

**Flujo:**
```
Visitante → Astro (SSG, estático) → POST /api/waitlist (Vercel function)
                                        ↓
                          Turnstile + honeypot + rate limit (Upstash)
                                        ↓
                          Insert en Neon (prepared statement)
                                        ↓
                          Resend dispara email de confirmación
                                        ↓
                          Click en link → /api/confirmar → status=confirmed

CMS: editor edita en Sanity Studio → webhook → rebuild en Vercel
```

**ADR — por qué Astro + Sanity y no las alternativas evaluadas:** ver comparación completa en `SRS-landing-page-core.md` §7 (Opción A vs B). Resumen: el destinatario del CMS es un cliente no técnico — la fricción de un flujo git-based (Opción B) contradice el principio de "operación ligera" de la agencia. Se acepta la dependencia de un proveedor SaaS externo como costo controlado (free tier cubre el volumen de una landing individual).

---

## 8. Integraciones

| Integración | Propósito | Valor de esta instancia | Notas de seguridad |
|-------------|-----------|--------------------------|---------------------|
| Sanity | Contenido editorial | Proyecto de demo dedicado | Token read-only en build, write-only server-side |
| Neon | Persistencia de leads | Instancia de demo | Prepared statements obligatorio |
| Resend | Email transaccional | Dominio `[PENDIENTE]` verificado con SPF/DKIM | Sin dominio verificado, cae en spam |
| Upstash | Rate limiting | Instancia de demo | Solo contadores, cero PII |
| GTM/GA4/Meta Pixel | Analítica de campaña | Propiedad y cuenta de **test**, separada de cualquier cliente real | Nonce vía CSP |
| Cloudflare Turnstile | Anti-bot | Sitekey de demo | Gratuito |
| WhatsApp | CTA de contacto | Número de prueba de la agencia | Click-to-chat, sin Business API |
| Dominio | Hosting público | `demo-landing-delta.vercel.app` (subdominio de Vercel) — decisión final, ver nota abajo | — |

**Nota sobre el dominio (resuelve el `[PENDIENTE]` original):** un dominio propio de la agencia no es un requisito técnico de ningún RF — es un subdominio HTTPS público real, GA4/Meta Pixel funcionan igual (un solo origen, sin complicaciones de cross-domain) y el CTA de WhatsApp (RF-003) no depende del dominio en absoluto. La necesidad de un dominio propio era de marca/presentación para mostrarle a prospectos, no funcional. Se decide usar el subdominio de Vercel como definitivo para esta demo — Build 4 deja de estar bloqueado por este ítem. (El dominio verificado con SPF/DKIM de **Resend**, fila de arriba, es un tema aparte — sigue pendiente porque afecta entregabilidad real de email, no hosting; ver R-05.)

---

## 9. Contenido de la landing (estructura de bloques del CMS)

1. **Hero:** nombre del producto, propuesta de valor en una línea, CTA principal ("Unirme a la lista de espera"), imagen/mockup.
2. **Problema/contexto:** por qué existe KOA Buds (2-3 líneas).
3. **Especificaciones técnicas:** cancelación de ruido activa, autonomía, resistencia al agua, Bluetooth 5.3, estuche de carga.
4. **Galería:** 3-4 imágenes de producto.
5. **Testimonios:** 2-3 citas de "beta testers" (contenido ficticio, marcado como tal internamente).
6. **FAQ:** fecha estimada de envío, precio estimado, compatibilidad.
7. **Formulario de waitlist:** nombre, email, checkbox de consentimiento (no premarcado).
8. **Footer:** CTA WhatsApp, redes sociales (placeholder).

`[PENDIENTE: copy final de cada bloque — ¿lo redacta marketing de la agencia o lo genero yo como parte de la demo?]`

---

## 10. Datos y consentimiento

**Texto propuesto para el checkbox:**
> "Acepto que KOA Buds use mi nombre y correo para notificarme sobre el lanzamiento del producto, según la Ley 1581 de 2012. Puedo solicitar la eliminación de mis datos en cualquier momento escribiendo a [email de contacto]."

**Retención propuesta:** 12 meses desde `consent_timestamp`, o hasta solicitud de baja — lo que ocurra primero. Job automatizado de purga mensual.

`[PENDIENTE: validar plazo de retención con criterio legal real si esta plantilla se reusa para un cliente real — 12 meses es un default razonable, no una decisión legal validada]`

---

## 11. Build Order

**Principio:** cada fase entrega un flujo verificable de punta a punta.

### Build 1: Infraestructura base
**Entregables verificables:** proyecto Astro deployado en Vercel (placeholder visible); conexión a Neon verificada; Sanity Studio accesible con schema cargado; `.env.example` completo.

### Build 2: Flujo core de captación
**Entregables verificables:** usuario real completa RF-001 + RF-002 de punta a punta y queda `confirmed`; honeypot rechaza sin insertar; rate limit dispara 429 en el 6º intento en 10 min.

### Build 3: Contenido editorial vía CMS
**Entregables verificables:** editar un bloque en Sanity se refleja en producción en < 2 min sin intervención de developer.

### Build 4: Integraciones externas
**Entregables verificables:** conversión visible en GA4 DebugView y Meta Pixel Helper; WhatsApp abre con mensaje prellenado y UTMs propagados. Ya no bloqueado por dominio (§8 — se usa el subdominio de Vercel). Pendiente configurar tags de GA4/Meta Pixel dentro del container de GTM (dashboard, fuera de este repo) y el número real de WhatsApp de prueba de la agencia (RF-003, contenido en Sanity).

### Build 5: Hardening final
**Entregables verificables:** securityheaders.com reporta A/A+; CSP bloquea payload XSS de prueba; SAST + secrets scan limpios en CI; Lighthouse ≥ 90 en Performance/Best Practices/SEO.

---

## 12. Plan de testing

- SAST automatizado en CI — no opcional
- Dependency scanning en CI — no opcional
- Secrets scanning en pre-commit y CI — no opcional
- E2E del flujo RF-001→RF-002 completo (Playwright)
- Test de rate limit: 6 requests consecutivos, verificar 429 en el sexto
- Test de honeypot: request con campo lleno, verificar que no hay insert
- Accesibilidad: axe-core en CI, sin errores críticos

---

## 13. Riesgos y mitigaciones

| ID | Riesgo | Probabilidad | Impacto | Mitigación | Owner |
|----|--------|-------------|---------|------------|-------|
| R-01 | Spam/bots inflan la lista de leads | Alta | Medio | Honeypot + Turnstile + rate limit | Dev |
| R-02 | Contador social proof expone velocidad real de campaña | Media | Bajo | Cache con delay ≥ 15 min | Dev |
| R-03 | Token de Sanity con permisos de escritura expuesto en cliente | Baja | Alto | Token read-only en build, write-only server-side | Dev |
| R-04 | Incumplimiento de Habeas Data por falta de consentimiento trazable | Media | Alto | Checkbox no premarcado + versión de texto registrada | PM |
| R-05 | Emails de confirmación caen en spam por dominio de Resend no verificado (sigue en dominio sandbox `onboarding@resend.dev`) | Alta | Alto | Verificar SPF/DKIM en un dominio propio para Resend — independiente del dominio de hosting (§8) | Dev |

---

## 14. Criterios de éxito de la demo

- Un visitante completa el flujo de waitlist de punta a punta (incluido el click de confirmación de email) en menos de 60 segundos.
- El sitio carga con LCP < 2.5s en 4G simulado — mismo umbral que cualquier proyecto real, sin relajar por ser demo.
- Un prospecto de la agencia puede ver, en vivo durante una reunión, un cambio de contenido publicado en Sanity reflejarse en el sitio sin ayuda técnica.
- CSP, rate limiting y honeypot están activos también en la demo — una demo insegura no prueba que el core funciona.

---

## 15. Fuera de scope de esta instancia

- Checkout ni pre-venta con pago.
- App móvil o integración con hardware real.
- Soporte multi-idioma.

---

## 16. Glosario

- **Lead:** contacto capturado por el formulario, aún no necesariamente confirmado.
- **Double opt-in:** confirmación de email en dos pasos.
- **Honeypot:** campo oculto invisible al usuario humano, visible a bots.
- **TWS:** True Wireless Stereo.
- **Bounded context:** límite dentro del cual un término del dominio tiene un significado preciso y consistente.

---

## 17. Historial de revisiones

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 0.1 | 2026-07-23 | Usuario + Arch-Sentinel | Combinación de core + instancia en documento único |
| 0.2 | 2026-07-24 | Usuario + Claude | Resuelto el `[PENDIENTE]` de dominio de hosting (§8): no es un requisito técnico de ningún RF, se adopta el subdominio de Vercel como definitivo — desbloquea Build 4. Aclarado que el dominio de Resend (SPF/DKIM, R-05) es un tema aparte y sigue pendiente. Builds 1, 2, 3 y 5 implementados y verificados contra Neon/Sanity/Upstash/Resend/Turnstile/GTM reales (detalle completo en `tasks/todo.md` y `tasks/lessons.md` del repo). |
