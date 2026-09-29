'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useQuote } from '@/components/quote-modal'
import { HERO_AUDIO, type VideoItem } from '@/lib/content'

type HeroProps = {
  videos: VideoItem[]
}

export function Hero({ videos }: HeroProps) {
  const { t } = useSite()
  const { open } = useQuote()
  const [index, setIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const [showDesktopNotice, setShowDesktopNotice] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Solo se muestran los vídeos que has subido tú desde el admin con categoría "hero".
  // Ya no se usan las fotos de stock que trajo la plantilla de V0.
  const slideCount = videos.length

  // Aviso de "optimizado para ordenador", solo en móvil y solo una vez por visita.
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 640px)').matches
    const alreadyShown = sessionStorage.getItem('dronesur_desktop_notice')
    if (isMobile && !alreadyShown) {
      setShowDesktopNotice(true)
      sessionStorage.setItem('dronesur_desktop_notice', '1')
    }
  }, [])

  // Arregla un fallo típico de Safari/iPhone: React no siempre marca el vídeo como
  // "silenciado" a nivel del navegador (solo a nivel de atributo), y eso hace que a
  // veces el vídeo no arranque solo y haga falta pulsar play. Esto lo fuerza siempre.
  const forcePlay = useCallback((el: HTMLVideoElement | null) => {
    if (!el) return
    el.muted = true
    void el.play().catch(() => {})
  }, [])

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

  // Cada vídeo de fondo, reutilizado tanto en la caja móvil como en el fondo de escritorio.
  // Si todavía no has subido ningún vídeo con categoría "hero", se muestra un fondo
  // neutro con el logo en vez de fotos de stock.
  const renderSlides = (mobile: boolean) =>
    videos.length > 0 ? (
      videos.map((v, i) => (
        <div
          key={v.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={i !== index}
        >
          <video
            ref={forcePlay}
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
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0b0e14] to-[#1a1f2b]">
        <span className="text-2xl font-extrabold tracking-wide text-white/60 sm:text-3xl">
          Drone<span className="text-[var(--gold)]">sur</span>
        </span>
      </div>
    )

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
        {/* Degradado negro arriba: para que el menú (Inicio, Instagram, ES/EN...) se lea
            bien sobre el vídeo, sin taparlo del todo. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-16 bg-gradient-to-b from-black/75 to-transparent" />
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
        {/* Degradado extra arriba: para que el menú se lea bien sobre el vídeo */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-32 bg-gradient-to-b from-black/70 to-transparent" />

        <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-end px-4 pb-24 text-center lg:pb-28">
          <h1 className="animate-fade-up text-balance text-4xl font-extrabold leading-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
            {t('hero.title')}
          </h1>
          <p className="animate-fade-up mt-4 max-w-2xl text-pretty text-base text-white/85 drop-shadow md:text-lg">
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

      {/* Aviso: "optimizado para ordenador" — solo en móvil, se puede cerrar */}
      {showDesktopNotice && (
        <div className="fixed inset-x-4 bottom-4 z-[200] flex items-center gap-3 rounded-xl border border-white/10 bg-[#12151c]/95 px-4 py-3 text-white shadow-xl backdrop-blur-sm sm:hidden">
          <p className="flex-1 text-xs leading-snug text-white/85">
            Este sitio está optimizado para verse en ordenador. En móvil algunas partes
            pueden verse distintas.
          </p>
          <button
            onClick={() => setShowDesktopNotice(false)}
            className="shrink-0 rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/90 transition hover:bg-white/10"
            aria-label="Cerrar aviso"
          >
            Entendido
          </button>
        </div>
      )}
    </section>
  )
}
