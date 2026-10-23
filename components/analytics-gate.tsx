'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { getConsent, CONSENT_EVENT } from '@/lib/consent'

// Las estadísticas de visitas solo se activan si el visitante ha pulsado "Aceptar".
// Si rechaza (o aún no ha elegido), no se carga nada.
export function AnalyticsGate() {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const sync = () => setAllowed(getConsent() === 'accepted')
    sync()
    window.addEventListener(CONSENT_EVENT, sync)
    return () => window.removeEventListener(CONSENT_EVENT, sync)
  }, [])

  if (process.env.NODE_ENV !== 'production' || !allowed) return null
  return <Analytics />
}
