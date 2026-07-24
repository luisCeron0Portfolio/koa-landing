import { useEffect, useId, useRef, useState } from 'react';
import { buildWhatsAppUrl, ELEVAFORGE_WHATSAPP_NUMBER } from '../lib/domain/content';

// RF-001: formulario de captación. Client-side es solo UX — toda la
// revalidación real ocurre en /api/waitlist (CLAUDE.md — Seguridad).

interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      remove?: (widgetId: string) => void;
      reset?: (widgetId?: string) => void;
    };
    // RF-005: inicializado siempre en GtmSnippet.astro, exista o no un
    // container real de GTM todavía.
    dataLayer?: Record<string, unknown>[];
  }
}

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
// Si el widget no entrega token en este plazo (widget roto, red caída), se
// desbloquea el botón igual para no dejarlo colgado — el submit guard mostrará
// un mensaje claro en vez de un 400 crudo.
const TURNSTILE_READY_FALLBACK_MS = 9000;
// Delay entre el 200 de éxito y la redirección a WhatsApp: le da tiempo al
// usuario de leer "¡Estás en la lista!" antes de que la pestaña navegue.
const WHATSAPP_REDIRECT_DELAY_MS = 1500;

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; emailSent: boolean }
  | { status: 'rate_limited'; retryAfter: number }
  | { status: 'error'; message: string };

interface FieldErrors {
  [field: string]: string;
}

// Encapsula el ciclo de vida del widget de Turnstile: carga el script, hace un
// único render (guardado por widgetId), resetea el token si expira/falla, y
// limpia el widget al desmontar. `ready` es true cuando: no hay Turnstile
// configurado, o ya hay token, o venció el fallback (widget que nunca cargó).
//
// Un token de Turnstile es de un solo uso: una vez que el server lo valida
// (éxito o fracaso), reintentar con el mismo token vuelve a fallar con 400
// `turnstile_failed` aunque el usuario no hizo nada mal (ej: corrigió un
// campo tras un 400 de validación y reenvió sin que el widget emitiera un
// token nuevo). Por eso `resetForRetry` se llama después de CUALQUIER
// intento de submit (falle o no) para forzar un token fresco antes del
// próximo click.
function useTurnstile(siteKey: string | undefined) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const fallbackTimerRef = useRef<number | undefined>(undefined);
  const [token, setToken] = useState<string>('');
  const [fallbackReady, setFallbackReady] = useState(false);

  useEffect(() => {
    if (!siteKey) {
      setFallbackReady(true);
      return;
    }

    let cancelled = false;
    fallbackTimerRef.current = window.setTimeout(() => {
      if (!cancelled) setFallbackReady(true);
    }, TURNSTILE_READY_FALLBACK_MS);

    function render() {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey as string,
        callback: (t: string) => setToken(t),
        'expired-callback': () => setToken(''),
        'error-callback': () => setToken(''),
      });
    }

    if (window.turnstile) {
      render();
    } else {
      const existing = document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener('load', render, { once: true });
      } else {
        const script = document.createElement('script');
        script.src = TURNSTILE_SCRIPT_SRC;
        script.async = true;
        script.addEventListener('load', render, { once: true });
        document.head.appendChild(script);
      }
    }

    // Al volver por bfcache (botón "atrás"/"adelante" del navegador), el JS
    // se reanuda con el widget y el token exactamente como estaban al salir
    // — pero el challenge ya pudo expirar del lado de Cloudflare mientras la
    // pestaña estaba en el historial. Forzamos un token nuevo al volver.
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) resetForRetry();
    }
    window.addEventListener('pageshow', onPageShow);

    return () => {
      cancelled = true;
      window.removeEventListener('pageshow', onPageShow);
      window.clearTimeout(fallbackTimerRef.current);
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // el widget ya no existe — nada que limpiar
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  function resetForRetry() {
    setToken('');
    setFallbackReady(false);
    window.clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = window.setTimeout(() => setFallbackReady(true), TURNSTILE_READY_FALLBACK_MS);
    if (widgetIdRef.current && window.turnstile?.reset) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // el widget ya no existe — nada que resetear
      }
    }
  }

  // El formulario se reemplaza por el estado de éxito sin desmontar el
  // componente (mismo WaitlistForm, distinto JSX) — el cleanup del effect de
  // arriba nunca corre solo. Sin este teardown explícito, Turnstile deja un
  // timer interno de auto-refresh apuntando a un widget cuyo contenedor ya no
  // está en el DOM → warning "Cannot find Widget" en consola.
  function teardown() {
    window.clearTimeout(fallbackTimerRef.current);
    if (widgetIdRef.current && window.turnstile?.remove) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // el widget ya no existe — nada que limpiar
      }
      widgetIdRef.current = null;
    }
  }

  const required = Boolean(siteKey);
  const ready = !required || token !== '' || fallbackReady;
  return { containerRef, token, ready, required, resetForRetry, teardown };
}

function getUtmParams(): { utmSource: string | null; utmMedium: string | null; utmCampaign: string | null } {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
  };
}

export default function WaitlistForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const formId = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [state, setState] = useState<SubmitState>({ status: 'idle' });
  const {
    containerRef: turnstileRef,
    token: turnstileToken,
    ready: turnstileReady,
    required: turnstileRequired,
    resetForRetry: resetTurnstile,
    teardown: teardownTurnstile,
  } = useTurnstile(turnstileSiteKey);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    // Turnstile requerido pero sin token: no mandamos el request (evita el 400
    // `turnstile_failed` y no gasta cupo de rate limit). El botón ya está
    // deshabilitado hasta `turnstileReady`; esto cubre el caso en que el
    // widget nunca entregó token y se desbloqueó por el fallback.
    if (turnstileRequired && !turnstileToken) {
      setState({
        status: 'error',
        message: 'No pudimos verificar que no seas un bot. Recargá la página e intentá de nuevo.',
      });
      return;
    }

    setState({ status: 'submitting' });

    const honeypot = (new FormData(event.currentTarget).get('company_website') as string) ?? '';
    const { utmSource, utmMedium, utmCampaign } = getUtmParams();

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          consent,
          honeypot,
          turnstileToken,
          utmSource,
          utmMedium,
          utmCampaign,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        // RF-005: evento de conversión — visible en GA4 DebugView / Meta
        // Pixel Helper una vez que haya un container de GTM real configurado
        // para mapearlo. `dataLayer` siempre existe (GtmSnippet.astro lo
        // inicializa), así que este push nunca falla aunque no haya GTM.
        window.dataLayer?.push({ event: 'waitlist_signup' });
        teardownTurnstile();
        setState({ status: 'success', emailSent: data.emailSent !== false });

        // Si dejó teléfono, redirigimos (misma pestaña, no window.open — un
        // popup abierto después de un await se bloquea) a WhatsApp con el
        // mismo mensaje del email: KOA Buds es una demo de Elevaforge del
        // producto "Landing Page", e invita a pedir la suya propia. El delay
        // le da tiempo a leer "¡Estás en la lista!" antes de navegar.
        if (phone) {
          const whatsappMessage = `Hola, soy ${name || 'un nuevo suscriptor'}. Vi la demo de KOA Buds — un caso de estudio de Elevaforge para mostrar el producto "Landing Page" — y me interesa tener mi propia landing page.`;
          const whatsappUrl = buildWhatsAppUrl(ELEVAFORGE_WHATSAPP_NUMBER, whatsappMessage);
          window.setTimeout(() => {
            window.location.href = whatsappUrl;
          }, WHATSAPP_REDIRECT_DELAY_MS);
        }
        return;
      }

      // Un token de Turnstile es de un solo uso: cualquier reintento (retry
      // por rate limit, corrección de un campo tras un 400 de validación,
      // etc.) necesita un token fresco o el server lo vuelve a rechazar con
      // `turnstile_failed` aunque el usuario ya corrigió lo que estaba mal.
      resetTurnstile();

      if (response.status === 429) {
        setState({ status: 'rate_limited', retryAfter: data.retry_after ?? 600 });
        return;
      }

      if (response.status === 400 && data.error === 'validation_failed' && Array.isArray(data.fields)) {
        const errors: FieldErrors = {};
        for (const fieldError of data.fields as { field: string; message: string }[]) {
          errors[fieldError.field] = fieldError.message;
        }
        setFieldErrors(errors);
        setState({ status: 'idle' });
        return;
      }

      setState({
        status: 'error',
        message: 'No pudimos procesar tu solicitud. Intentá de nuevo en un momento.',
      });
    } catch {
      resetTurnstile();
      setState({ status: 'error', message: 'Falló la conexión. Revisá tu internet e intentá de nuevo.' });
    }
  }

  if (state.status === 'success') {
    return (
      <div className="wl-success" role="status">
        <span className="wl-success-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <p className="wl-success-title">¡Estás en la lista!</p>
        <p className="wl-success-text">
          {state.emailSent
            ? 'Revisá tu email para confirmar tu lugar. Te avisamos apenas abramos el lanzamiento.'
            : 'Te sumamos a la lista de espera. Te avisamos apenas abramos el lanzamiento.'}
        </p>
        {phone && <p className="wl-success-redirect">Te estamos llevando a WhatsApp…</p>}
      </div>
    );
  }

  return (
    <form className="wl-form" onSubmit={handleSubmit} noValidate>
      {/* Honeypot: oculto vía CSS (no `hidden`), SRS §5. Un humano nunca lo ve ni lo completa.
          Clase en vez de `style` inline: un atributo `style=""` cae bajo
          style-src-attr, que el hash de <style> de Astro no cubre — con CSP
          estricta (sin 'unsafe-inline') el navegador lo bloquea. */}
      <div aria-hidden="true" className="visually-hidden">
        <label htmlFor={`${formId}-company`}>Empresa</label>
        <input id={`${formId}-company`} name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="wl-field">
        <label className="wl-label" htmlFor={`${formId}-name`}>
          Nombre
        </label>
        <input
          className="wl-input"
          id={`${formId}-name`}
          name="name"
          type="text"
          required
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(fieldErrors.name)}
        />
        {fieldErrors.name && (
          <p className="wl-error" role="alert">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className="wl-field">
        <label className="wl-label" htmlFor={`${formId}-email`}>
          Email
        </label>
        <input
          className="wl-input"
          id={`${formId}-email`}
          name="email"
          type="email"
          required
          placeholder="vos@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
        />
        {fieldErrors.email && (
          <p className="wl-error" role="alert">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="wl-field">
        <label className="wl-label" htmlFor={`${formId}-phone`}>
          Teléfono <span className="wl-optional">(opcional, para WhatsApp)</span>
        </label>
        <input
          className="wl-input"
          id={`${formId}-phone`}
          name="phone"
          type="tel"
          placeholder="+573001234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={Boolean(fieldErrors.phone)}
        />
        {fieldErrors.phone && (
          <p className="wl-error" role="alert">
            {fieldErrors.phone}
          </p>
        )}
      </div>

      <div className="wl-field">
        <label className="wl-consent">
          <input
            className="wl-checkbox"
            type="checkbox"
            name="consent"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            Acepto que KOA Buds use mi nombre y correo para notificarme sobre el lanzamiento del producto,
            según la Ley 1581 de 2012.
          </span>
        </label>
        {fieldErrors.consent && (
          <p className="wl-error" role="alert">
            {fieldErrors.consent}
          </p>
        )}
      </div>

      <div className="wl-turnstile" ref={turnstileRef} />

      {state.status === 'rate_limited' && (
        <p className="wl-alert" role="alert">
          Demasiados intentos. Probá de nuevo en {Math.ceil(state.retryAfter / 60)} minutos.
        </p>
      )}
      {state.status === 'error' && (
        <p className="wl-alert" role="alert">
          {state.message}
        </p>
      )}

      <button
        className="btn btn-primary wl-submit"
        type="submit"
        disabled={state.status === 'submitting' || !turnstileReady}
      >
        {state.status === 'submitting'
          ? 'Enviando…'
          : !turnstileReady
            ? 'Verificando…'
            : 'Unirme a la lista de espera'}
      </button>

      <p className="wl-fineprint">Sin spam. Podés darte de baja cuando quieras.</p>
    </form>
  );
}
