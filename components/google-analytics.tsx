'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { enableAnalytics, disableAnalytics, trackEvent } from '@/lib/analytics'

// Solo se monta cuando el visitante ha aceptado las estadísticas (ver analytics-gate.tsx).
// Al desmontarse (rechaza o retira el consentimiento) detiene la medición y borra las cookies de Google Analytics.
export function GoogleAnalytics() {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin') ?? false // el panel de administración no se mide

  useEffect(() => {
    if (isAdmin) return
    enableAnalytics()
    return () => disableAnalytics()
  }, [isAdmin])

  // Contacto directo: clic en el correo, en el teléfono o en un enlace a WhatsApp.
  // Son señales de interés, no conversiones por sí solas. No se envía la dirección, el número ni el texto del enlace.
  useEffect(() => {
    if (isAdmin) return
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href]')
      const href = link?.getAttribute('href') ?? ''
      if (!href) return
      if (href.startsWith('mailto:')) trackEvent('click_email')
      else if (href.startsWith('tel:')) trackEvent('click_phone')
      else if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(href)) trackEvent('click_whatsapp')
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [isAdmin])

  return null
}
