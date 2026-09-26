'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useQuote } from '@/components/quote-modal'
import { WhatsAppIcon } from '@/components/icons'
import type { Category } from '@/lib/content'

export function CategoryDetail({ category }: { category: Category }) {
  const { t, tl } = useSite()
  const { open } = useQuote()
  const [index, setIndex] = useState(0)

  const gallery = category.gallery.length ? category.gallery : [category.image]
  const next = () => setIndex((i) => (i + 1) % gallery.length)
  const prev = () => setIndex((i) => (i - 1 + gallery.length) % gallery.length)

  const included = ['cover.inc1', 'cover.inc2', 'cover.inc3', 'cover.inc4']

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      <Link
        href="/#servicios"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('cat.back')}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Gallery carousel */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('cat.gallery')}
          </h2>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border">
            {gallery.map((src, i) => (
              <Image
                key={src + i}
                src={src || '/placeholder.svg'}
                alt={`${tl(category.title)} ${i + 1}`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className={`object-cover transition-opacity duration-500 ${
                  i === index ? 'opacity-100' : 'opacity-0'
                }`}
                priority={i === 0}
              />
            ))}
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-black/40 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
              aria-label={t('hero.prev')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-black/40 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
              aria-label={t('hero.next')}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
              {gallery.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Imagen ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? 'w-7 bg-[var(--gold)]' : 'w-2 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            {gallery.map((src, i) => (
              <button
                key={src + i}
                onClick={() => setIndex(i)}
                className={`relative aspect-video overflow-hidden rounded-lg border-2 transition ${
                  i === index ? 'border-[var(--gold)]' : 'border-transparent opacity-70'
                }`}
              >
                <Image
                  src={src || '/placeholder.svg'}
                  alt=""
                  fill
                  sizes="150px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <span className="inline-block rounded-full bg-[var(--gold)] px-4 py-1.5 text-sm font-bold text-[var(--gold-foreground)]">
            {tl(category.price)}
          </span>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{tl(category.title)}</h1>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            {tl(category.description)}
          </p>

          <ul className="mt-7 space-y-3">
            {included.map((key) => (
              <li key={key} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)]">
                  <Check className="h-4 w-4" />
                </span>
                <span className="text-sm text-foreground/90">{t(key)}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => open({ service: tl(category.title), discount: true })}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1ebe5b]"
          >
            <WhatsAppIcon className="h-5 w-5" />
            {t('cat.quote')}
          </button>
        </div>
      </div>
    </main>
  )
}
