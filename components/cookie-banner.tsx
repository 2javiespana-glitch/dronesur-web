'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getConsent, setConsent, OPEN_EVENT, type Consent } from '@/lib/consent'
import { useSite } from '@/components/site-provider'

// Aceptar y Rechazar tienen EXACTAMENTE el mismo aspecto y están en la misma capa:
// es lo que exige la guía de cookies de la AEPD. No cambies el estilo de uno sin el otro.
const BUTTON =
  'flex-1 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const { lang } = useSite()
  const en = lang === 'en'

  useEffect(() => {
    if (getConsent() === null) setVisible(true)
    const reopen = () => setVisible(true)
    window.addEventListener(OPEN_EVENT, reopen)
    return () => window.removeEventListener(OPEN_EVENT, reopen)
  }, [])

  if (!visible) return null

  const choose = (value: Consent) => {
    setConsent(value)
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-label={en ? 'Cookie notice' : 'Aviso de cookies'}
      className="fixed inset-x-3 bottom-3 z-[300] mx-auto max-w-xl rounded-2xl border border-border bg-card p-5 shadow-2xl sm:inset-x-auto sm:bottom-4 sm:left-4 sm:mx-0"
    >
      <p className="text-sm font-semibold">{en ? 'Cookies and storage' : 'Cookies y almacenamiento'}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {en ? (
          <>
            We use essential technical storage (for example, to remember your language and your
            theme). With your permission, we also measure visits anonymously to improve the website.
            You can accept or reject these statistics just as easily, and change your mind whenever
            you like. More information in the{' '}
            <Link href="/politica-de-cookies" className="underline hover:text-gold">
              Cookie Policy
            </Link>
            .
          </>
        ) : (
          <>
            Usamos almacenamiento técnico imprescindible (por ejemplo, para recordar tu idioma y tu
            tema). Con tu permiso, también medimos las visitas de forma anónima para mejorar la web.
            Puedes aceptar o rechazar estas estadísticas con la misma facilidad, y cambiar de opinión
            cuando quieras. Más información en la{' '}
            <Link href="/politica-de-cookies" className="underline hover:text-gold">
              Política de cookies
            </Link>
            .
          </>
        )}
      </p>
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={() => choose('rejected')} className={BUTTON}>
          {en ? 'Reject' : 'Rechazar'}
        </button>
        <button type="button" onClick={() => choose('accepted')} className={BUTTON}>
          {en ? 'Accept' : 'Aceptar'}
        </button>
      </div>
    </div>
  )
}
