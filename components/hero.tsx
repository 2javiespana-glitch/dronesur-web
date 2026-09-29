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

  // Cada "slide" (vídeo o imagen) de fondo, reutilizado tanto en la caja móvil como en el fondo de escritorio.
  const renderSlides = (mobile: boolean) =>
    usingCustomVideos
      ? videos.map((v, i) => (
          <div
            key={v.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden={i !== index}
          >
            <video
              className={`h-full w-full ${mobile ? 'object-contain' : 'object-cover'}`}
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
                className={`h-full w-full ${mobile ? 'object-contain' : 'object-cover'}`}
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
        ))

  // Flechas, puntos y botón de silenciar, reutilizados en las dos versiones (tamaño distinto en cada una).
  const controls = (compact: boolean) => (
    <>
      <button
        onClick={prev}
        className={`absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/30 bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/70 ${
          compact ? 'p-1.5' : 'p-2.5 sm:left-6'
        }`}
        aria-label={t('hero.prev')}
      >
        <ChevronLeft className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </button>
      <button
        onClick={next}
        className={`absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/30 bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/70 ${
          compact ? 'p-1.5' : 'p-2.5 sm:right-6'
        }`}
        aria-label={t('hero.next')}
      >
        <ChevronRight className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </button>
      <div
        className={`absolute left-1/2 z-20 flex -translate-x-1/2 gap-2 ${
          compact ? 'bottom-3' : 'bottom-8'
        }`}
      >
        {Array.from({ length: slideCount }).map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
            className={`rounded-full transition-all ${compact ? 'h-1' : 'h-1.5'} ${
              i === index
                ? `${compact ? 'w-5' : 'w-8'} bg-[var(--gold)]`
                : `${compact ? 'w-1.5' : 'w-2.5'} bg-white/50`
            }`}
          />
        ))}
      </div>
    </>
  )

  return (
    <section id="top" className="relative w-full overflow-hidden bg-black sm:h-[100svh]">
      {/* ---------- MÓVIL: caja de vídeo horizontal (estilo YouTube), sin recortar ---------- */}
      <div className="relative aspect-video w-full sm:hidden">
        {renderSlides(true)}
        <div className="pointer-events-none absolute inset-0 bg-black/10" />
        {controls(true)}
        <button
          onClick={toggleMute}
          className="absolute bottom-3 right-3 z-20 rounded-full border border-white/30 bg-black/40 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
          aria-label={muted ? t('hero.mute') : t('hero.unmute')}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>

      {/* ---------- MÓVIL: contenido debajo del vídeo, ya no encima ---------- */}
      <div className="flex flex-col items-center gap-5 bg-[#0b0e14] px-4 py-8 text-center sm:hidden">
        <h1 className="text-balance text-3xl font-extrabold leading-tight text-white">
          {t('hero.title')}
        </h1>
        <p className="max-w-md text-pretty text-sm text-white/80">{t('hero.subtitle')}</p>
        <div className="flex w-full flex-col gap-3 xs:flex-row xs:justify-center">
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

      {/* ---------- ESCRITORIO: igual que siempre, vídeo a pantalla completa con el texto encima ---------- */}
      <div className="absolute inset-0 hidden sm:block">
        {renderSlides(false)}
        <div className="pointer-events-none absolute inset-0 bg-black/40" />
        <div className="pointer-events-none absolute inset-0 bg-hero-fade" />

        <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-4 text-center">
          <h1 className="animate-fade-up text-balance text-5xl font-extrabold leading-tight text-white drop-shadow-lg md:text-6xl lg:text-7xl">
            {t('hero.title')}
          </h1>
          <p className="animate-fade-up mt-5 max-w-2xl text-pretty text-lg text-white/85 drop-shadow md:text-xl">
            {t('hero.subtitle')}
          </p>
          <div className="animate-fade-up mt-8 flex flex-col gap-3 sm:flex-row">
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

        {controls(false)}

        <button
          onClick={toggleMute}
          className="absolute bottom-6 right-6 z-20 rounded-full border border-white/30 bg-black/40 p-3 text-white backdrop-blur-sm transition hover:bg-black/70"
          aria-label={muted ? t('hero.mute') : t('hero.unmute')}
        >
          {muted ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>

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
      </div>

      {/* Música de fondo cinematográfica (común a móvil y escritorio) */}
      <audio ref={audioRef} src={HERO_AUDIO} loop muted preload="none" />
    </section>
  )
}
