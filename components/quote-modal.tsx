'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import { Mail, X } from 'lucide-react'
import { CATEGORIES, SITE, type Category } from '@/lib/content'
import { useSite } from '@/components/site-provider'
import { WhatsAppIcon } from '@/components/icons'
import { openEmail } from '@/lib/email-link'
import { useDialogFocus } from '@/lib/use-dialog-focus'
import { LEGAL } from '@/lib/legal'
import {
  FALLBACK_DISCOUNT_MESSAGE,
  normalizeQuoteDiscount,
  type QuoteDiscount,
} from '@/lib/quotes'

type QuoteContextValue = {
  open: (opts?: { service?: string; discount?: boolean; location?: string }) => void
}

const QuoteContext = createContext<QuoteContextValue | null>(null)

export function QuoteProvider({ children }: { children: React.ReactNode }) {
  const { t, tl, lang } = useSite()
  const [isOpen, setIsOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogFocus(isOpen, dialogRef)
  const [service, setService] = useState('')
  const [location, setLocation] = useState('')
  const [details, setDetails] = useState('')
  const [contact, setContact] = useState('') // teléfono o correo (opcional)
  const [website, setWebsite] = useState('') // cuadro trampa para programas spam: debe quedar vacío
  const [quotesEnabled, setQuotesEnabled] = useState(false) // ¿se guardan las solicitudes? (lo decide el admin)
  const [discount, setDiscount] = useState(true)
  // Ajustes de la casilla de descuento (los decide el admin). null = todavía cargando: la casilla no se muestra.
  const [discountCfg, setDiscountCfg] = useState<QuoteDiscount | null>(null)
  // Letra pequeña bajo la casilla del descuento (la escribe el admin; vacío = no se muestra).
  const [finePrintCfg, setFinePrintCfg] = useState<{ es: string; en: string }>({ es: '', en: '' })
  const [categories, setCategories] = useState<Category[]>(CATEGORIES)

  // Solo cuenta como «pedir descuento» si la casilla está activada en el admin y marcada.
  const discountOn = discountCfg?.enabled === true && discount
  const custom = (es: string | undefined, en: string | undefined) => ((lang === 'en' ? en : es) ?? '').trim()
  const discountLabel = custom(discountCfg?.labelEs, discountCfg?.labelEn) || t('wa.discount')
  const discountMessage =
    custom(discountCfg?.messageEs, discountCfg?.messageEn) || FALLBACK_DISCOUNT_MESSAGE[lang === 'en' ? 'en' : 'es']

  const finePrint = (lang === 'en' ? finePrintCfg.en : finePrintCfg.es).trim()

  const open = (opts?: { service?: string; discount?: boolean; location?: string }) => {
    if (opts?.service) setService(opts.service)
    if (opts?.location) setLocation(opts.location)
    if (typeof opts?.discount === 'boolean') setDiscount(opts.discount)
    setIsOpen(true)
  }

  // Al abrir el formulario, carga las categorías reales (las creadas u ocultadas desde el admin).
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    fetch('/api/categories', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setCategories(data)
      })
      .catch(() => {
        // Si falla, se muestran las categorías de siempre.
      })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  // Al abrir el formulario, lee los ajustes de la casilla de descuento (activada/desactivada y sus textos).
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        setDiscountCfg(normalizeQuoteDiscount(data?.quoteDiscount))
        const po = data?.promoOverride
        setFinePrintCfg({
          es: typeof po?.finePrintEs === 'string' ? po.finePrintEs : '',
          en: typeof po?.finePrintEn === 'string' ? po.finePrintEn : '',
        })
      })
      .catch(() => {
        // Si falla, se muestra la casilla de siempre (activada, con los textos de siempre).
        if (!cancelled) setDiscountCfg((prev) => prev ?? normalizeQuoteDiscount(null))
      })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  // ¿Está activado guardar las solicitudes? (interruptor del admin). Si no, no se menciona ni se envía nada.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    fetch('/api/quotes?config=1', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setQuotesEnabled(data?.enabled === true)
      })
      .catch(() => {
        if (!cancelled) setQuotesEnabled(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const buildMessage = () => {
    const lines: string[] = []
    if (lang === 'es') {
      lines.push('¡Hola Dronesur! Me gustaría pedir un presupuesto.')
      if (service) lines.push(`• Servicio: ${service}`)
      if (location) lines.push(`• Localidad: ${location}`)
      if (details) lines.push(`• Detalles: ${details}`)
      if (discountOn) lines.push(`• ${discountMessage}`)
    } else {
      lines.push('Hi Dronesur! I would like to request a quote.')
      if (service) lines.push(`• Service: ${service}`)
      if (location) lines.push(`• Location: ${location}`)
      if (details) lines.push(`• Details: ${details}`)
      if (discountOn) lines.push(`• ${discountMessage}`)
    }
    return lines.join('\n')
  }

  // Guarda la solicitud en el servidor (y te avisa por Telegram), aunque luego el cliente no envíe el mensaje.
  // Es "disparar y olvidar": si falla, no afecta a que se abra WhatsApp o el correo.
  const recordQuote = (channel: 'whatsapp' | 'email') => {
    if (!quotesEnabled) return
    try {
      void fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          quote: { service, location, details, contact, discount: discountOn, lang, channel, website },
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      // Se ignora a propósito.
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    recordQuote('whatsapp')
    const url = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(buildMessage())}`
    window.open(url, '_blank', 'noopener,noreferrer')
    setIsOpen(false)
  }

  // Misma solicitud, pero abriendo el programa de correo con el mensaje ya escrito.
  const sendByEmail = () => {
    recordQuote('email')
    const subject = lang === 'es' ? 'Solicitud de presupuesto' : 'Quote request'
    openEmail(LEGAL.email, subject, buildMessage())
    setIsOpen(false)
  }

  return (
    <QuoteContext.Provider value={{ open }}>
      {children}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('wa.title')}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div ref={dialogRef} className="animate-fade-up relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label={t('wa.close')}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold">
                <WhatsAppIcon className="h-3.5 w-3.5" />
                {t('wa.title')}
              </span>
              <p className="mt-3 text-sm text-muted-foreground">{t('wa.intro')}</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="q-contact">
                  {lang === 'es' ? 'Tu teléfono o correo' : 'Your phone or email'}
                </label>
                <input
                  id="q-contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={120}
                  autoComplete="tel"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                  placeholder={lang === 'es' ? '600 000 000 o tu@correo.com' : '600 000 000 or you@email.com'}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {lang === 'es'
                    ? 'Te llamamos con el presupuesto. Si prefieres, déjanos tu correo.'
                    : "We'll call you with your quote. Prefer email? Leave that instead."}
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="q-service">
                  {t('wa.service')}
                </label>
                <select
                  id="q-service"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                >
                  <option value="">{t('wa.selectPlaceholder')}</option>
                  {categories.filter((c) => c.visible !== false).map((c) => (
                    <option key={c.slug} value={tl(c.title)}>
                      {tl(c.title)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="q-loc">
                  {t('wa.location')}
                </label>
                <input
                  id="q-loc"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                  placeholder="Almería, Málaga, Granada…"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="q-det">
                  {t('wa.details')}
                </label>
                <textarea
                  id="q-det"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                />
              </div>

              {/* Cuadro trampa: una persona no lo ve. Si un programa spam lo rellena, la solicitud se descarta. */}
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
              />

              {discountCfg?.enabled && (
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-3">
                  <input
                    type="checkbox"
                    checked={discount}
                    onChange={(e) => setDiscount(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[var(--gold)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{discountLabel}</span>
                    {finePrint && (
                      <span className="mt-1 block whitespace-pre-line text-xs font-normal text-muted-foreground">
                        {finePrint}
                      </span>
                    )}
                  </span>
                </label>
              )}

              {quotesEnabled && (
                <p className="text-xs text-muted-foreground">
                  {lang === 'es'
                    ? 'Al continuar, guardamos tu solicitud para poder responderte, aunque no llegues a enviar el mensaje. Más información en la '
                    : "By continuing, we save your request so we can reply, even if you don't end up sending the message. More information in the "}
                  <Link
                    href="/politica-de-privacidad"
                    onClick={() => setIsOpen(false)}
                    className="underline underline-offset-2 hover:text-gold"
                  >
                    {lang === 'es' ? 'Política de privacidad' : 'Privacy policy'}
                  </Link>
                  .
                </p>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)]"
              >
                <WhatsAppIcon className="h-4 w-4" />
                {t('wa.send')}
              </button>

              <button
                type="button"
                onClick={sendByEmail}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold transition hover:border-[var(--gold)] hover:text-gold"
              >
                <Mail className="h-4 w-4" />
                {lang === 'es' ? 'Enviar por correo' : 'Send by email'}
              </button>
            </form>
          </div>
        </div>
      )}
    </QuoteContext.Provider>
  )
}

export function useQuote() {
  const ctx = useContext(QuoteContext)
  if (!ctx) throw new Error('useQuote must be used within QuoteProvider')
  return ctx
}
