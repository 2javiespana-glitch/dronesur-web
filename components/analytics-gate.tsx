'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { getConsent, CONSENT_EVENT } from '@/lib/consent'
import { GoogleAnalytics } from '@/components/google-analytics'
import { VisitTracker } from '@/components/visit-tracker'

// Las estadísticas de visitas, de velocidad (Speed Insights), el recuento por provincia y Google Analytics
// solo se activan si el visitante ha pulsado "Aceptar".
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
  return (
    <>
      <Analytics />
      <SpeedInsights />
      <GoogleAnalytics />
      <VisitTracker />
    </>
  )
}
