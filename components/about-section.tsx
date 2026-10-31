'use client'

import Image from 'next/image'
import { useSite } from '@/components/site-provider'
import { type SiteContent, localizedOr, optimizeImage } from '@/lib/site-content'

// Los textos y la foto se pueden cambiar desde el admin ("Sobre Dronesur").
// Si no has puesto nada, se usan los textos de siempre.
export function AboutSection({ content }: { content: SiteContent['about'] }) {
  const { t, lang } = useSite()

  const p1 = localizedOr(content.p1, lang) || t('about.p1')
  const p2 = localizedOr(content.p2, lang) || t('about.p2')

  const stats = [
    { value: '6', label: t('about.stat1') },
    { value: '4K', label: t('about.stat2') },
    { value: '48h', label: t('about.stat3') },
  ]

  return (
    <section id="sobre" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border">
          {content.image ? (
            <>
              <Image
                src={optimizeImage(content.image, 1200)}
                alt="Dronesur — vuelo sobre el sur de España"
                fill
                unoptimized
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/50 to-transparent" />
            </>
          ) : (
            // Mientras no subas una foto, se ve esto en vez de una imagen rota.
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0b0e14] to-[#1a1f2b]">
              <span className="text-2xl font-extrabold tracking-wide text-white/60 sm:text-3xl">
                Drone<span className="text-[var(--gold)]">sur</span>
              </span>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-3xl font-extrabold sm:text-4xl">{t('about.title')}</h2>
          <div className="mt-5 h-1 w-16 rounded-full bg-[var(--gold)]" />
          <p className="mt-6 whitespace-pre-line leading-relaxed text-muted-foreground">{p1}</p>
          <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">{p2}</p>

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
