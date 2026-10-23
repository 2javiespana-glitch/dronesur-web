'use client'

import Link from 'next/link'
import { openCookieSettings } from '@/lib/consent'

// Barra de enlaces legales al final de TODAS las páginas de la web.
// Es lo que exige la ley: poder llegar al Aviso legal, a la Privacidad y a las Cookies
// desde cualquier sitio, y poder cambiar la elección de cookies cuando se quiera.
export function LegalLinks() {
  return (
    <nav
      aria-label="Información legal"
      className="border-t border-border bg-background px-4 pb-20 pt-5 text-center text-xs text-muted-foreground sm:pb-5"
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <Link href="/aviso-legal" className="transition hover:text-gold">
          Aviso legal
        </Link>
        <Link href="/politica-de-privacidad" className="transition hover:text-gold">
          Política de privacidad
        </Link>
        <Link href="/politica-de-cookies" className="transition hover:text-gold">
          Política de cookies
        </Link>
        <button type="button" onClick={openCookieSettings} className="transition hover:text-gold">
          Configurar cookies
        </button>
      </div>
    </nav>
  )
}
