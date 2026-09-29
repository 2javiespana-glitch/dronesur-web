'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useQuote } from '@/components/quote-modal'
import { HERO_AUDIO, HERO_SLIDES, type VideoItem } from '@/lib/content'

type HeroProps = {
  videos: VideoItem[]
}

export function Hero({ videos }: HeroProps) {
  const { t, tl } = useSite()
  const { open } = useQuote()
  const [index, setIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Si hay vídeos guardados con categoría "hero", se usan esos.
  // Si todavía no hay ninguno, se muestran las 3 imágenes de ejemplo de siempre.
  const usingCustomVideos = videos.length > 0
  const slideCount = usingCustomVideos ? videos.length : HERO_SLIDES.length

  const next = useCallback(
    () => setIndex((i) => (i + 1) % slideCount),
    [slideCount],
  )
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + slideCount) % slideCount),
    [slideCount],
  )

  useEffect(() => {
    const id = setInterval(next, 6000)
    return () => clearInterval(id)
  }, [next])

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    if (muted) {
      audio.muted = false
      audio.volume = 0.5
      void audio.play().catch(() => {})
      setMuted(false)
    } else {
      audio.muted = true
      setMuted(true)
    }
  }

  return (
    <>
      {/*
        Aviso a pantalla completa: solo aparece si el móvil está en vertical Y la pantalla
        es estrecha (menos de 900px), para no afectar nunca a ordenador. Desaparece solo,
        sin JavaScript, en cuanto el usuario gira el móvil a horizontal.
      */}
      <style>{`
        .rotate-lock { display: none; }
        @media (orientation: portrait) and (max-width: 900px) {
          .rotate-lock { display: flex; }
        }
      `}</style>
      <div className="rotate-lock fixed inset-0 z-[999] flex-col items-center justify-center gap-4 bg-black px-8 text-center text-white">
        <svg
          viewBox="0 0 24 24"
          className="h-14 w-14 animate-pulse"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M12 18h.01" />
        </svg>
        <p className="text-lg font-semibold">Gira tu móvil para continuar</p>
        <p className="text-sm text-white/70">
          Esta web se ve mejor en horizontal.
        </p>
      </div>

    <section id="top" className="relative h-[100svh] w-full overflow-hidden">
      {/* Slides */}
      {usingCustomVideos
        ? videos.map((v, i) => (
            <div
              key={v.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                i === index ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden={i !== index}
            >
              <video
                className="h-full w-full object-cover"
                src={v.url}
                poster={v.poster}
                autoPlay
                muted
                loop
                playsInline
              />
            </div>
          ))
        : HERO_SLIDES.map((slide, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                i === index ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden={i !== index}
            >
              {slide.video ? (
                <video
                  className="h-full w-full object-cover"
                  src={slide.video}
                  poster={slide.poster}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <Image
                  src={slide.poster || '/placeholder.svg'}
                  alt={tl({ es: slide.captionEs, en: slide.captionEn })}
                  fill
                  priority={i === 0}
                  className="object-cover"
                  sizes="100vw"
                />
              )}
            </div>
          ))}

      {/* Overlays */}
      <div className="pointer-events-none absolute inset-0 bg-black/40" />
      <div className="pointer-events-none absolute inset-0 bg-hero-fade" />

      {/* Cinematic background music */}
      <audio ref={audioRef} src={HERO_AUDIO} loop muted preload="none" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-4 text-center">
        <h1
          className="animate-fade-up text-balance text-4xl font-extrabold leading-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl lg:text-7xl"
          style={{ animationDelay: '0.05s' }}
        >
          {t('hero.title')}
        </h1>
        <p
          className="animate-fade-up mt-5 max-w-2xl text-pretty text-base text-white/85 drop-shadow sm:text-lg md:text-xl"
          style={{ animationDelay: '0.15s' }}
        >
          {t('hero.subtitle')}
        </p>
        <div
          className="animate-fade-up mt-8 flex flex-col gap-3 sm:flex-row"
          style={{ animationDelay: '0.25s' }}
        >
          <button
            onClick={() => open()}
            className="rounded-full bg-[var(--gold)] px-7 py-3 text-sm font-semibold text-[var(--gold-foreground)] shadow-lg transition hover:bg-[var(--gold-soft)]"
          >
            {t('hero.cta')}
          </button>
          <a
            href="#servicios"
            className="rounded-full border border-white/40 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            {t('hero.services')}
          </a>
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/30 bg-black/30 p-2.5 text-white backdrop-blur-sm transition hover:bg-black/60 sm:left-6"
        aria-label={t('hero.prev')}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/30 bg-black/30 p-2.5 text-white backdrop-blur-sm transition hover:bg-black/60 sm:right-6"
        aria-label={t('hero.next')}
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {Array.from({ length: slideCount }).map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-8 bg-[var(--gold)]' : 'w-2.5 bg-white/50'
            }`}
          />
        ))}
      </div>

      {/* Mute / unmute */}
      <button
        onClick={toggleMute}
        className="absolute bottom-6 right-6 z-20 rounded-full border border-white/30 bg-black/40 p-3 text-white backdrop-blur-sm transition hover:bg-black/70"
        aria-label={muted ? t('hero.mute') : t('hero.unmute')}
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {/* Scroll indicator */}
      <a
        href="#promociones"
        className="absolute bottom-6 left-6 z-20 hidden flex-col items-center gap-1 text-white/80 transition hover:text-white sm:flex"
        aria-label={t('hero.scroll')}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest">
          {t('hero.scroll')}
        </span>
        <ChevronDown className="animate-scroll-bob h-5 w-5" />
      </a>
    </section>
    </>
  )
}
