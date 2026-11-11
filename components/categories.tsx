'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Lightbulb } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useLocalePath } from '@/components/use-locale-path'
import { useQuote } from '@/components/quote-modal'
import type { Category } from '@/lib/content'
import { optimizeImage } from '@/lib/site-content'

// Las categorías (ya sin las ocultas) y sus portadas llegan desde el servidor (lib/home-data.ts).
export function Categories({
  categories,
  covers,
}: {
  categories: Category[]
  covers: Record<string, string>
}) {
  const { t, tl } = useSite()
  const localePath = useLocalePath()
  const { open } = useQuote()
  if (categories.length === 0) return null

  return (
    <section id="servicios" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold sm:text-4xl">{t('cat.title')}</h2>
        <p className="mt-3 text-muted-foreground">{t('cat.subtitle')}</p>
        <div className="mx-auto mt-5 h-1 w-16 rounded-full bg-[var(--gold)]" />
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          // Precio de la tarjeta: si lo dejas en blanco en el admin, no se muestra la insignia amarilla.
          const price = tl(cat.price).trim()
          return (
          <article
            key={cat.slug}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-[var(--gold)]/50 hover:shadow-lg"
          >
            <Link
              href={localePath(`/servicios/${cat.slug}`)}
              className="relative block aspect-[4/3] overflow-hidden"
            >
              <Image
                // La portada subida a Cloudinary se pide a 1200 px de ancho máx. y comprimida (antes, a tamaño original).
                src={covers[cat.slug] ? optimizeImage(covers[cat.slug], 1200) : cat.image || '/placeholder.svg'}
                alt={tl(cat.title)}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              {price && (
                <span className="absolute bottom-3 left-3 rounded-full bg-[var(--gold)] px-3 py-1 text-xs font-bold text-[var(--gold-foreground)]">
                  {price}
                </span>
              )}
            </Link>

            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-lg font-bold leading-snug">{tl(cat.title)}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">
                {tl(cat.short)}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Link
                  href={localePath(`/servicios/${cat.slug}`)}
                  className="inline-flex flex-1 basis-[8.5rem] items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-border px-4 py-2 text-xs font-semibold transition hover:border-[var(--gold)] hover:text-gold"
                >
                  {t('cat.view')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <button
                  onClick={() => open({ service: tl(cat.title) })}
                  className="inline-flex flex-1 basis-[8.5rem] items-center justify-center whitespace-nowrap rounded-full bg-[var(--gold)] px-4 py-2 text-xs font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)]"
                >
                  {t('cat.quote')}
                </button>
              </div>
            </div>
          </article>
          )
        })}

        {/* Tarjeta final: «¿No encuentras tu caso?». No es una categoría con página propia: abre el presupuesto. */}
        <article className="relative flex min-h-[18rem] flex-col justify-center overflow-hidden rounded-2xl border border-[var(--gold)]/40 bg-gradient-to-br from-[var(--gold)]/15 via-card to-card p-7 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[var(--gold)] sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[var(--gold)]/20 blur-3xl" />
          <div className="relative flex flex-col items-start">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--gold-foreground)]">
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              {t('cat.custom.badge')}
            </span>
            <h3 className="mt-5 text-3xl font-extrabold leading-tight">
              <span className="text-gold">{t('cat.custom.title')}</span>
            </h3>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('cat.custom.text')}
            </p>
            <button
              onClick={() => open()}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-semibold text-[var(--gold-foreground)] shadow-lg transition hover:bg-[var(--gold-soft)] sm:w-auto"
            >
              {t('cat.custom.cta')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </article>
      </div>
    </section>
  )
}
