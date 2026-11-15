'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, Sparkles } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useQuote } from '@/components/quote-modal'
import { playableVideoUrl, videoPosterUrl } from '@/lib/media-url'
import { localizedOr, optimizeImage } from '@/lib/site-content'
import type { Lang } from '@/lib/content'
import type { ShowcaseData, ShowcaseSlide } from '@/lib/showcase'

// Sección «oportunidad» (debajo del banner de descuento): texto, botón y un carrusel pequeño de
// fotos o vídeos con ideas de para qué aprovechar la oferta. Todo se edita en el admin.
// Los datos llegan ya leídos desde el servidor (lib/home-data.ts).

// Tiempo que se ve cada foto antes de pasar a la siguiente.
const SLIDE_MS = 2000
// Anchos que se piden a Cloudinary (el carrusel es pequeño, no hace falta más).
const IMAGE_WIDTH = 900
const VIDEO_WIDTH = 960

const LABELS = {
  es: {
    region: 'Ideas para aprovechar la oferta',
    slide: (n: number, total: number) => `${n} de ${total}`,
    prev: 'Anterior',
    next: 'Siguiente',
    go: (n: number) => `Ir a la imagen ${n}`,
    pause: 'Pausar carrusel',
    play: 'Reanudar carrusel',
    title: 'Aprovecha la oportunidad',
    cta: '¡Aprovecha la oportunidad!',
  },
  en: {
    region: 'Ideas to make the most of the offer',
    slide: (n: number, total: number) => `${n} of ${total}`,
    prev: 'Previous',
    next: 'Next',
    go: (n: number) => `Go to image ${n}`,
    pause: 'Pause carousel',
    play: 'Resume carousel',
    title: 'Make the most of this opportunity',
    cta: 'Take the opportunity!',
  },
} as const

function ShowcaseCarousel({ slides, lang }: { slides: ShowcaseSlide[]; lang: Lang }) {
  const L = LABELS[lang]
  const count = slides.length
  const [index, setIndex] = useState(0)
  const [userPaused, setUserPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [visible, setVisible] = useState(false) // el carrusel se ve ahora mismo en pantalla
  const [seen, setSeen] = useState(false) // ya se ha visto alguna vez: a partir de aquí se cargan los vídeos
  const [reduced, setReduced] = useState(false) // la persona prefiere menos movimiento
  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const swipeStart = useRef<number | null>(null)

  const safeIndex = Math.min(index, count - 1)
  const current = slides[safeIndex]

  const go = (to: number) => setIndex(((to % count) + count) % count)

  // «Reducir movimiento» del sistema: sin avance automático y los vídeos no arrancan solos.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // Solo se mueve y reproduce mientras se ve en pantalla (y los vídeos no se descargan antes de llegar aquí).
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      setSeen(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting)
        if (entry.isIntersecting) setSeen(true)
      },
      { threshold: 0.25 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Avance automático. Una foto se ve SLIDE_MS; un vídeo avanza solo al terminar (con un tope por si falla).
  const autoplay = count > 1 && visible && !userPaused && !reduced && !hovered && !focused
  useEffect(() => {
    if (!autoplay) return
    const wait = current.kind === 'video' ? 30000 : SLIDE_MS
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), wait)
    return () => clearTimeout(timer)
  }, [autoplay, safeIndex, count, current.kind])

  // Reproduce o pausa el vídeo visible según si se ve y si se ha pausado.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (visible && !userPaused && !reduced) void video.play().catch(() => {})
    else video.pause()
  }, [visible, userPaused, reduced, safeIndex, seen])

  return (
    <div
      ref={rootRef}
      role="group"
      aria-roledescription="carousel"
      aria-label={L.region}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={(e) => {
        // Solo el foco de teclado pausa el avance: tras hacer clic con el ratón en una flecha, el carrusel sigue su curso.
        try {
          if (e.target.matches(':focus-visible')) setFocused(true)
        } catch {
          setFocused(true) // navegadores antiguos sin :focus-visible
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
      }}
      onKeyDown={(e) => {
        if (count < 2) return
        if (e.key === 'ArrowLeft') go(safeIndex - 1)
        if (e.key === 'ArrowRight') go(safeIndex + 1)
      }}
      className="mx-auto w-full max-w-md"
    >
      <div
        // Deslizar con el dedo (la página sigue pudiendo desplazarse hacia arriba y abajo).
        onPointerDown={(e) => {
          swipeStart.current = e.clientX
        }}
        onPointerUp={(e) => {
          const start = swipeStart.current
          swipeStart.current = null
          if (start === null || count < 2) return
          const dx = e.clientX - start
          if (Math.abs(dx) > 40) go(safeIndex + (dx < 0 ? 1 : -1))
        }}
        onPointerCancel={() => {
          swipeStart.current = null
        }}
        className="relative aspect-[4/3] touch-pan-y overflow-hidden rounded-2xl border border-border bg-muted shadow-lg"
      >
        {slides.map((slide, i) => {
          const active = i === safeIndex
          const caption = localizedOr(slide.caption, lang)
          const alt = localizedOr(slide.alt, lang) || caption
          const poster = slide.kind === 'video' ? videoPosterUrl(slide.url, VIDEO_WIDTH) : undefined
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={L.slide(i + 1, count)}
              aria-hidden={!active}
              className={`absolute inset-0 transition-opacity duration-500 ${
                active ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              {slide.kind === 'image' ? (
                <img
                  src={optimizeImage(slide.url, IMAGE_WIDTH)}
                  alt={alt}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              ) : active && seen ? (
                <video
                  ref={videoRef}
                  src={playableVideoUrl(slide.url, VIDEO_WIDTH)}
                  poster={poster}
                  aria-label={alt || undefined}
                  muted
                  playsInline
                  preload="metadata"
                  loop={count === 1}
                  controls={reduced}
                  onEnded={() => {
                    if (count > 1) setIndex((n) => (n + 1) % count)
                  }}
                  onError={() => {
                    if (count > 1) setIndex((n) => (n + 1) % count)
                  }}
                  className="h-full w-full object-cover"
                />
              ) : poster ? (
                <img src={poster} alt={alt} loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />
              ) : null}

              {caption && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-4 pb-3 pt-10">
                  <p className="text-pretty text-sm font-semibold text-white drop-shadow">{caption}</p>
                </div>
              )}
            </div>
          )
        })}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(safeIndex - 1)}
              aria-label={L.prev}
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(safeIndex + 1)}
              aria-label={L.next}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setUserPaused((p) => !p)}
            aria-label={userPaused ? L.play : L.pause}
            title={userPaused ? L.play : L.pause}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-[var(--gold)] hover:text-gold"
          >
            {userPaused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5 fill-current" />}
          </button>
          <div className="flex items-center gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => go(i)}
                aria-label={L.go(i + 1)}
                aria-current={i === safeIndex}
                className={`h-2 rounded-full transition-all ${
                  i === safeIndex ? 'w-6 bg-[var(--gold)]' : 'w-2 bg-muted-foreground/40 hover:bg-muted-foreground/70'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ShowcaseSection({ data }: { data: ShowcaseData }) {
  const { lang } = useSite()
  const { open } = useQuote()
  const L = LABELS[lang]
  const { text, slides, carousel } = data

  // Cada idioma usa solo sus textos. Título y botón, si se dejan en blanco, llevan un texto de siempre;
  // la insignia y el texto descriptivo solo salen si los escribes tú.
  const badge = (lang === 'en' ? text.badgeEn : text.badgeEs).trim()
  const title = (lang === 'en' ? text.titleEn : text.titleEs).trim() || L.title
  const body = (lang === 'en' ? text.textEn : text.textEs).trim()
  const cta = (lang === 'en' ? text.ctaEn : text.ctaEs).trim() || L.cta
  const hasCarousel = carousel && slides.length > 0

  return (
    <section id="oportunidad" className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--gold)]/30 bg-gradient-to-br from-card via-card to-[var(--gold)]/10 p-6 shadow-xl sm:p-10">
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[var(--gold)]/15 blur-3xl" />
          <div className={`relative grid items-center gap-x-10 gap-y-6 ${hasCarousel ? 'md:grid-cols-2' : ''}`}>
            <div className={hasCarousel ? 'md:col-start-1 md:row-start-1 md:self-end' : ''}>
              {badge && (
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--gold-foreground)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  {badge}
                </span>
              )}
              <h2 className={`text-balance text-2xl font-extrabold sm:text-3xl ${badge ? 'mt-4' : ''}`}>{title}</h2>
              {body && (
                <p className="mt-3 whitespace-pre-line text-pretty text-base text-muted-foreground sm:text-lg">{body}</p>
              )}
            </div>

            {hasCarousel && (
              <div className="md:col-start-2 md:row-span-2 md:row-start-1 md:self-center">
                <ShowcaseCarousel slides={slides} lang={lang} />
              </div>
            )}

            <div className={hasCarousel ? 'md:col-start-1 md:row-start-2 md:self-start' : ''}>
              <button
                type="button"
                onClick={() => open({ discount: true })}
                className="rounded-full bg-[var(--gold)] px-7 py-3.5 text-sm font-semibold text-[var(--gold-foreground)] shadow-lg transition hover:bg-[var(--gold-soft)]"
              >
                {cta}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
