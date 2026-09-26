'use client'

import Image from 'next/image'
import { useSite } from '@/components/site-provider'

export function AboutSection() {
  const { t } = useSite()

  const stats = [
    { value: '6', label: t('about.stat1') },
    { value: '4K', label: t('about.stat2') },
    { value: '48h', label: t('about.stat3') },
  ]

  return (
    <section id="sobre" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border">
          <Image
            src="/hero/hero-mountains.png"
            alt="Dronesur — vuelo sobre el sur de España"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/50 to-transparent" />
        </div>

        <div>
          <h2 className="text-3xl font-extrabold sm:text-4xl">{t('about.title')}</h2>
          <div className="mt-5 h-1 w-16 rounded-full bg-[var(--gold)]" />
          <p className="mt-6 leading-relaxed text-muted-foreground">{t('about.p1')}</p>
          <p className="mt-4 leading-relaxed text-muted-foreground">{t('about.p2')}</p>

          <div className="mt-8 grid grid-cols-3 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-border bg-card p-4 text-center"
              >
                <p className="text-3xl font-extrabold text-gold">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
