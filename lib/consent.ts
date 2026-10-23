// Guarda y lee la elección de cookies del visitante (aceptar / rechazar).
// La elección caduca a los 12 meses, para volver a preguntar con cierta frecuencia.

export type Consent = 'accepted' | 'rejected'

export const CONSENT_KEY = 'dronesur-cookie-consent'
export const CONSENT_EVENT = 'dronesur:consent-changed'
export const OPEN_EVENT = 'dronesur:open-cookie-banner'

const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000

export function getConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const { value, ts } = JSON.parse(raw) as { value: Consent; ts: number }
    if (Date.now() - ts > MAX_AGE_MS) return null
    return value === 'accepted' || value === 'rejected' ? value : null
  } catch {
    return null
  }
}

export function setConsent(value: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ value, ts: Date.now() }))
  } catch {
    // Si el navegador no deja guardar, la elección vale solo para esta visita.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT))
}

// Vuelve a mostrar el banner (para que el visitante pueda cambiar de opinión).
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}
