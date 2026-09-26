'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { X } from 'lucide-react'
import { CATEGORIES, SITE } from '@/lib/content'
import { useSite } from '@/components/site-provider'
import { WhatsAppIcon } from '@/components/icons'

type QuoteContextValue = {
  open: (opts?: { service?: string; discount?: boolean }) => void
}

const QuoteContext = createContext<QuoteContextValue | null>(null)

export function QuoteProvider({ children }: { children: React.ReactNode }) {
  const { t, tl, lang } = useSite()
  const [isOpen, setIsOpen] = useState(false)
  const [service, setService] = useState('')
  const [location, setLocation] = useState('')
  const [details, setDetails] = useState('')
  const [discount, setDiscount] = useState(true)

  const open = (opts?: { service?: string; discount?: boolean }) => {
    if (opts?.service) setService(opts.service)
    if (typeof opts?.discount === 'boolean') setDiscount(opts.discount)
    setIsOpen(true)
  }

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
      if (discount)
        lines.push('• Solicito aplicar el 15% de descuento de bienvenida (nuevo cliente).')
    } else {
      lines.push('Hi Dronesur! I would like to request a quote.')
      if (service) lines.push(`• Service: ${service}`)
      if (location) lines.push(`• Location: ${location}`)
      if (details) lines.push(`• Details: ${details}`)
      if (discount)
        lines.push('• I request the 15% welcome discount (new client).')
    }
    return lines.join('\n')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const url = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(buildMessage())}`
    window.open(url, '_blank', 'noopener,noreferrer')
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
          <div className="animate-fade-up relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8">
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
                  {CATEGORIES.map((c) => (
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
                  placeholder="Málaga, Granada…"
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

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-3">
                <input
                  type="checkbox"
                  checked={discount}
                  onChange={(e) => setDiscount(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--gold)]"
                />
                <span className="text-sm font-medium text-foreground">
                  {t('wa.discount')}
                </span>
              </label>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)]"
              >
                <WhatsAppIcon className="h-4 w-4" />
                {t('wa.send')}
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
