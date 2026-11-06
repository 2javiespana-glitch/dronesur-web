'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { useA11y, type A11yKey } from '@/components/accessibility-provider'
import { useSite } from '@/components/site-provider'
import { useDialogFocus } from '@/lib/use-dialog-focus'
import { openEmail } from '@/lib/email-link'
import { LEGAL } from '@/lib/legal'

// Este componente vive fuera de las páginas /en, así que el idioma también se deduce de la dirección.
function useIsEnglish() {
  const { lang } = useSite()
  const pathname = usePathname()
  return lang === 'en' || pathname === '/en' || pathname.startsWith('/en/')
}

// Enlace "Saltar al contenido": invisible para quien usa el ratón. Solo aparece cuando alguien
// navega con el teclado y pulsa Tab nada más entrar en la página. No cambia el aspecto de la web.
export function SkipLink() {
  const en = useIsEnglish()
  return (
    <a
      href="#contenido"
      onClick={(e) => {
        e.preventDefault()
        const main = document.querySelector('main')
        if (!main) return
        main.setAttribute('tabindex', '-1')
        main.focus()
        main.scrollIntoView()
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[300] focus:rounded-lg focus:bg-[var(--gold)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--gold-foreground)]"
    >
      {en ? 'Skip to content' : 'Saltar al contenido'}
    </a>
  )
}

const OPTIONS: {
  key: A11yKey
  es: { label: string; desc: string }
  en: { label: string; desc: string }
}[] = [
  {
    key: 'reduceMotion',
    es: {
      label: 'Reducir animaciones',
      desc: 'Quita movimientos y transiciones, y deja el carrusel del inicio en pausa.',
    },
    en: {
      label: 'Reduce motion',
      desc: 'Removes movement and transitions, and keeps the home carousel paused.',
    },
  },
  {
    key: 'focusRing',
    es: {
      label: 'Resaltar el foco del teclado',
      desc: 'Marca con un borde grueso dónde estás cuando navegas con la tecla Tab.',
    },
    en: {
      label: 'Highlight keyboard focus',
      desc: 'Draws a thick outline around where you are when navigating with the Tab key.',
    },
  },
  {
    key: 'largeText',
    es: { label: 'Texto más grande', desc: 'Aumenta el tamaño de todo el texto de la web.' },
    en: { label: 'Larger text', desc: 'Increases the size of all text on the site.' },
  },
  {
    key: 'highContrast',
    es: { label: 'Más contraste en los textos', desc: 'Aclara los textos grises para leerlos mejor.' },
    en: { label: 'Higher text contrast', desc: 'Makes grey text easier to read.' },
  },
  {
    key: 'underlineLinks',
    es: { label: 'Subrayar enlaces', desc: 'Todos los enlaces se muestran subrayados.' },
    en: { label: 'Underline links', desc: 'All links are shown underlined.' },
  },
]

export function AccessibilityPanel() {
  const { panelOpen, closePanel, settings, setSetting, reset } = useA11y()
  const en = useIsEnglish()
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogFocus(panelOpen, dialogRef)

  useEffect(() => {
    if (!panelOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [panelOpen, closePanel])

  if (!panelOpen) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closePanel} />
      <div
        ref={dialogRef}
        className="relative z-10 max-h-[90svh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={closePanel}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={en ? 'Close' : 'Cerrar'}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="a11y-title" className="text-xl font-bold">
          {en ? 'Accessibility' : 'Accesibilidad'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {en
            ? 'Adjust how the site looks and behaves. Your choice is remembered on this device.'
            : 'Ajusta cómo se ve y se comporta la web. Tu elección se recuerda en este dispositivo.'}
        </p>

        <div className="mt-5 space-y-2.5">
          {OPTIONS.map((o) => {
            const text = en ? o.en : o.es
            return (
              <label
                key={o.key}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition hover:border-[var(--gold)]/50"
              >
                <input
                  type="checkbox"
                  checked={settings[o.key]}
                  onChange={(e) => setSetting(o.key, e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--gold)]"
                />
                <span>
                  <span className="block text-sm font-medium">{text.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{text.desc}</span>
                </span>
              </label>
            )
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
          >
            {en ? 'Reset' : 'Restablecer'}
          </button>
          <button
            type="button"
            onClick={closePanel}
            className="rounded-full bg-[var(--gold)] px-5 py-2 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)]"
          >
            {en ? 'Done' : 'Hecho'}
          </button>
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          {en
            ? 'Found an accessibility problem? Write to us at '
            : '¿Has encontrado algún problema de accesibilidad? Escríbenos a '}
          <a
            href={`mailto:${LEGAL.email}`}
            onClick={(e) => {
              e.preventDefault()
              openEmail(LEGAL.email)
            }}
            className="underline underline-offset-2 hover:text-gold"
          >
            {LEGAL.email}
          </a>
          .
        </p>
      </div>
    </div>
  )
}
