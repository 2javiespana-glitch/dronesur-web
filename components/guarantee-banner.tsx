'use client'

import { ShieldCheck } from 'lucide-react'
import { useSite } from '@/components/site-provider'

export function GuaranteeBanner() {
  const { t } = useSite()

  return (
    <section className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-soft)] p-8 text-center text-[var(--gold-foreground)] sm:p-10">
          <div className="pointer-events-none absolute inset-0 opacity-10">
            <div className="absolute -left-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-black/40 blur-2xl" />
          </div>
          <div className="relative flex flex-col items-center gap-3">
            <ShieldCheck className="h-10 w-10" />
            <h2 className="text-2xl font-extrabold sm:text-3xl">{t('guarantee.title')}</h2>
            <p className="max-w-xl text-pretty text-base font-medium sm:text-lg">
              {t('guarantee.text')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
