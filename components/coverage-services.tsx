'use client'

import { Check, MapPin } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { SITE } from '@/lib/content'

export function CoverageServices() {
  const { t } = useSite()
  const included = ['cover.inc1', 'cover.inc2', 'cover.inc3', 'cover.inc4', 'cover.inc5']

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{t('cover.title')}</h2>
          <div className="mx-auto mt-5 h-1 w-16 rounded-full bg-[var(--gold)]" />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Coverage */}
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--gold)]/15 text-gold">
                <MapPin className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-bold">{t('cover.geoTitle')}</h3>
            </div>
            <p className="mt-4 text-muted-foreground">{t('cover.geoText')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {SITE.coverage.map((prov) => (
                <span
                  key={prov}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-4 py-2 text-sm font-semibold"
                >
                  <MapPin className="h-4 w-4 text-gold" />
                  {prov}
                </span>
              ))}
            </div>
          </div>

          {/* Included services */}
          <div className="rounded-2xl border border-border bg-card p-8">
            <h3 className="text-xl font-bold">{t('cover.includedTitle')}</h3>
            <ul className="mt-6 space-y-4">
              {included.map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)]">
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="text-sm leading-relaxed text-foreground/90">
                    {t(key)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
