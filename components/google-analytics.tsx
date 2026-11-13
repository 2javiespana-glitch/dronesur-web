// Google Analytics 4 (GA4), integrado con el sistema de cookies que ya existe (lib/consent.ts).
//
// Reglas:
//  · No se carga NADA de Google antes de que el visitante pulse «Aceptar» (Consent Mode v2 en modalidad básica).
//  · Si rechaza, o retira después su elección, se detiene la recogida y se borran las cookies de GA.
//  · No se envía ningún dato personal: ni formularios, ni teléfonos, ni correos, ni identificadores propios.
//
// Quien decide cuándo se llama a enableAnalytics / disableAnalytics es components/analytics-gate.tsx
// (a través de components/google-analytics.tsx), con la misma elección de cookies que Vercel Analytics.

import { getConsent } from '@/lib/consent'

export const GA_ID = 'G-8PB8XG7Z04'

const SCRIPT_ID = 'ga4-gtag-js'
const DISABLE_KEY = `ga-disable-${GA_ID}` // interruptor oficial de Google para parar la medición
const COOKIES = ['_ga', `_ga_${GA_ID.replace('G-', '')}`]

type Gtag = (...args: unknown[]) => void
type GaWindow = Window & {
  dataLayer?: unknown[]
  gtag?: Gtag
  __ga4Ready?: boolean
  [key: string]: unknown
}

const win = (): GaWindow | null => (typeof window === 'undefined' ? null : (window as unknown as GaWindow))

function ensureGtag(w: GaWindow): Gtag {
  w.dataLayer = w.dataLayer || []
  if (!w.gtag) {
    // Google exige empujar el objeto `arguments` tal cual, no un array.
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments)
    }
  }
  return w.gtag
}

function deleteGaCookies() {
  const host = window.location.hostname
  const root = host.split('.').slice(-2).join('.')
  const domains = ['', `; domain=${host}`, `; domain=.${host}`, `; domain=.${root}`]
  for (const name of COOKIES) {
    for (const d of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d}; SameSite=Lax`
    }
  }
}

// Se llama SOLO cuando hay consentimiento. Es seguro llamarla varias veces: la etiqueta se carga una sola vez.
export function enableAnalytics() {
  const w = win()
  if (!w || getConsent() !== 'accepted') return
  w[DISABLE_KEY] = false
  const gtag = ensureGtag(w)

  if (w.__ga4Ready) {
    // Ya estaba cargada en esta visita (el visitante la había parado y la vuelve a aceptar).
    gtag('consent', 'update', { analytics_storage: 'granted' })
    gtag('event', 'page_view')
    return
  }
  w.__ga4Ready = true

  // Consent Mode v2: todo denegado por defecto; solo se concede la analítica porque el visitante la ha aceptado.
  // No usamos publicidad, así que ad_storage, ad_user_data y ad_personalization se quedan en «denied».
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  })
  gtag('js', new Date())
  gtag('consent', 'update', { analytics_storage: 'granted' })
  // Medición mejorada de GA4: vistas de página (también al navegar), scroll, enlaces externos, descargas, vídeo de YouTube...
  gtag('config', GA_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  })

  if (!document.getElementById(SCRIPT_ID)) {
    const s = document.createElement('script')
    s.id = SCRIPT_ID
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
    document.head.appendChild(s)
  }
}

// Se llama cuando se rechaza, se retira el consentimiento o se sale de la zona pública.
export function disableAnalytics() {
  const w = win()
  if (!w) return
  w[DISABLE_KEY] = true
  if (w.gtag) w.gtag('consent', 'update', { analytics_storage: 'denied' })
  deleteGaCookies()
}

// Evento propio. Solo se envía si el visitante ha aceptado y GA está cargada; si no, no hace nada.
// Nunca pases aquí textos escritos por el visitante (nombre, teléfono, localidad, detalles...).
export function trackEvent(name: string, params?: Record<string, string | number>) {
  const w = win()
  if (!w || !w.gtag || w[DISABLE_KEY] === true) return
  if (getConsent() !== 'accepted') return
  w.gtag('event', name, params ?? {})
}
