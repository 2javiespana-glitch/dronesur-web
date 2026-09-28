'use client'

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useQuote } from '@/components/quote-modal'
import { WhatsAppIcon } from '@/components/icons'
import type { Category, VideoItem } from '@/lib/content'

type GalleryItem = { id: string; url: string; type: 'image' | 'video' }

// Cloudinary puede generar una foto de portada de cualquier vídeo cambiando la extensión a .jpg
function videoThumb(url: string) {
  if (!url.includes('res.cloudinary.com')) return null
  return url.replace(/\.[a-z0-9]+(\?.*)?$/i, '.jpg')
}

export function CategoryDetail({ category }: { category: Category }) {
  const { t, tl } = useSite()
  const { open } = useQuote()
  const [index, setIndex] = useState(0)
  const [custom, setCustom] = useState<GalleryItem[]>([])

  // Carga las fotos y vídeos que has subido desde el admin para ESTA categoría.
  useEffect(() => {
    let cancelled = false
    fetch('/api/media', { cache: 'no-store' })
      .then((r) => r.json())
      .then((all: VideoItem[]) => {
        if (cancelled || !Array.isArray(all)) return
        setCustom(
          all
            .filter((m) => m.category === category.slug)
            .map((m) => ({
              id: m.id,
              url: m.url,
              type: m.type === 'image' ? 'image' : 'video',
            })),
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [category.slug])

  // Si todavía no has subido nada para esta categoría, se muestran las fotos de ejemplo.
  const fallback: GalleryItem[] = (category.gallery.length ? category.gallery : [category.image]).map(
    (url, i) => ({ id: `static-${i}`, url, type: 'image' as const }),
  )
  const items = custom.length > 0 ? custom : fallback
  const current = items[Math.min(index, items.length - 1)]

  const next = () => setIndex((i) => (i + 1) % items.length)
  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length)

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
        {/* Gallery */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('cat.gallery')}
          </h2>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-black">
            {current.type === 'video' ? (
              <video
                key={current.id}
                src={current.url}
                className="h-full w-full object-contain"
                controls
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img
                key={current.id}
                src={current.url || '/placeholder.svg'}
                alt={`${tl(category.title)} ${index + 1}`}
                className="h-full w-full object-cover"
              />
            )}

            {items.length > 1 && (
              <>
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
              </>
            )}
          </div>

          {items.length > 1 && (
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {items.map((item, i) => {
                const thumb = item.type === 'video' ? videoThumb(item.url) : item.url
                return (
                  <button
                    key={item.id}
                    onClick={() => setIndex(i)}
                    className={`relative aspect-video overflow-hidden rounded-lg border-2 bg-muted transition ${
                      i === index ? 'border-[var(--gold)]' : 'border-transparent opacity-70'
                    }`}
                    aria-label={`${item.type === 'video' ? 'Vídeo' : 'Imagen'} ${i + 1}`}
                  >
                    {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}
                    {item.type === 'video' && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-6 w-6 fill-white text-white" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
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
