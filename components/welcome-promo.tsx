'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useQuote } from '@/components/quote-modal'

type PromoOverride = {
  badgeEs: string
  titleEs: string
  textEs: string
  ctaEs: string
  badgeEn: string
  titleEn: string
  textEn: string
  ctaEn: string
}

export function WelcomePromo() {
  const { t, lang } = useSite()
  const { open } = useQuote()
  const [override, setOverride] = useState<PromoOverride | null>(null)

  // Insignia, título y botón: si los dejas en blanco en el admin, se usa el texto de siempre.
  // Texto descriptivo (el de debajo del título): solo aparece si lo escribes tú. En blanco = no se muestra.
  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.promoOverride) setOverride(data.promoOverride)
      })
      .catch(() => {})
  }, [])

  const pick = (custom: string | undefined, fallback: string) =>
    custom && custom.trim() ? custom : fallback

  const badge = pick(lang === 'en' ? override?.badgeEn : override?.badgeEs, t('promo.badge'))
  const title = pick(lang === 'en' ? override?.titleEn : override?.titleEs, t('promo.title'))
  const text = ((lang === 'en' ? override?.textEn : override?.textEs) ?? '').trim()
  // Botón: si lo dejas en blanco en el admin, sale «¡Vamos allá!» / «Let’s go!».
  const cta = pick(
    lang === 'en' ? override?.ctaEn : override?.ctaEs,
    lang === 'en' ? 'Let’s go!' : '¡Vamos allá!',
  )

  return (
    <section id="promociones" className="relative px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--gold)]/40 bg-gradient-to-br from-[var(--gold)]/15 via-card to-card p-8 shadow-xl sm:p-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--gold)]/20 blur-3xl" />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--gold-foreground)]">
                <Sparkles className="h-3.5 w-3.5" />
                {badge}
              </span>
              <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">
                <span className="text-gold">{title}</span>
              </h2>
              {text && (
                <p className="mt-3 text-pretty text-base text-muted-foreground sm:text-lg">
                  {text}
                </p>
              )}
            </div>
            <button
              onClick={() => open({ discount: true })}
              className="shrink-0 rounded-full bg-[var(--gold)] px-7 py-3.5 text-sm font-semibold text-[var(--gold-foreground)] shadow-lg transition hover:bg-[var(--gold-soft)]"
            >
              {cta}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
