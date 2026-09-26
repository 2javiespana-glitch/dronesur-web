'use client'

import { ShieldCheck, Usb } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { SwissTransferIcon, TelegramIcon } from '@/components/icons'

export function LegalSection() {
  const { t } = useSite()

  const compliance = ['legal.aesa', 'legal.easa', 'legal.insured']
  const delivery = [
    { key: 'USB', icon: Usb },
    { key: 'SwissTransfer', icon: SwissTransferIcon },
    { key: 'Telegram', icon: TelegramIcon },
  ]

  return (
    <section id="garantia-legal" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-12">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gold)]/15 text-gold">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h2 className="text-2xl font-extrabold sm:text-3xl">{t('legal.title')}</h2>
          </div>

          <p className="mt-5 max-w-3xl text-pretty leading-relaxed text-muted-foreground">
            {t('legal.text')}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {compliance.map((key) => (
              <span
                key={key}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-4 py-2 text-sm font-semibold"
              >
                <ShieldCheck className="h-4 w-4 text-gold" />
                {t(key)}
              </span>
            ))}
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('legal.deliveryTitle')}
            </p>
            <div className="flex flex-wrap gap-3">
              {delivery.map(({ key, icon: Icon }) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium"
                >
                  <Icon className="h-4 w-4 text-gold" />
                  {key}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
