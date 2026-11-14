'use client'

import { useEffect, useRef, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { getConsent, CONSENT_EVENT } from '@/lib/consent'
import { GoogleAnalytics } from '@/components/google-analytics'
import { disableAnalytics } from '@/lib/analytics'
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

  // Si el visitante retira el consentimiento en plena visita, se recarga la página. Google Analytics y el
  // recuento de provincias se paran al desmontarse, pero los scripts de Vercel (Speed Insights, Analytics) no
  // tienen forma de detenerse una vez cargados: seguirían midiendo hasta cerrar la pestaña. Recargar es lo
  // único que garantiza que se detiene TODO. Tras la recarga, con «rechazado», no se carga nada.
  const wasAllowed = useRef(false)
  useEffect(() => {
    if (wasAllowed.current && !allowed && process.env.NODE_ENV === 'production') {
      disableAnalytics()
      window.location.reload()
    }
    wasAllowed.current = allowed
  }, [allowed])

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
