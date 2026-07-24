import { useEffect, useId, useRef, useState } from 'react';

// RF-001: formulario de captación. Client-side es solo UX — toda la
// revalidación real ocurre en /api/waitlist (CLAUDE.md — Seguridad).

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void },
      ) => string;
    };
    // RF-005: inicializado siempre en GtmSnippet.astro, exista o no un
    // container real de GTM todavía.
    dataLayer?: Record<string, unknown>[];
  }
}

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success' }
  | { status: 'rate_limited'; retryAfter: number }
  | { status: 'error'; message: string };

interface FieldErrors {
  [field: string]: string;
}

function useTurnstile(siteKey: string | undefined) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    function render() {
      if (window.turnstile && containerRef.current) {
        window.turnstile.render(containerRef.current, {
          sitekey: siteKey as string,
          callback: setToken,
        });
      }
    }

    if (window.turnstile) {
      render();
      return;
    }

    const existing = document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', render, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.addEventListener('load', render, { once: true });
    document.head.appendChild(script);
  }, [siteKey]);

  return { containerRef, token };
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
  const { containerRef: turnstileRef, token: turnstileToken } = useTurnstile(turnstileSiteKey);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
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

      if (response.ok) {
        // RF-005: evento de conversión — visible en GA4 DebugView / Meta
        // Pixel Helper una vez que haya un container de GTM real configurado
        // para mapearlo. `dataLayer` siempre existe (GtmSnippet.astro lo
        // inicializa), así que este push nunca falla aunque no haya GTM.
        window.dataLayer?.push({ event: 'waitlist_signup' });
        setState({ status: 'success' });
        return;
      }

      const data = await response.json().catch(() => ({}));

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
          Revisá tu email para confirmar tu lugar. Te avisamos apenas abramos el lanzamiento.
        </p>
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

      <button className="btn btn-primary wl-submit" type="submit" disabled={state.status === 'submitting'}>
        {state.status === 'submitting' ? 'Enviando…' : 'Unirme a la lista de espera'}
      </button>

      <p className="wl-fineprint">Sin spam. Podés darte de baja cuando quieras.</p>
    </form>
  );
}
