'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useQuote } from '@/components/quote-modal'
import type { VideoItem } from '@/lib/content'
import { playableVideoUrl } from '@/lib/media-url'

type HeroProps = {
  videos: VideoItem[]
  music?: string // dirección de la música (se pone desde el admin); vacío = sin música
}

export function Hero({ videos, music }: HeroProps) {
  const { t } = useSite()
  const { open } = useQuote()
  const [index, setIndex] = useState(0)
  // Id del vídeo que ya tiene imagen lista para reproducirse. Mientras no coincida con el
  // vídeo actual, se muestra el círculo de carga (y el carrusel no avanza).
  const [readyId, setReadyId] = useState<string | null>(null)
  // true = móvil, false = escritorio, null = aún no se sabe. Solo se carga el vídeo de UNA
  // de las dos versiones (antes se cargaban las dos, aunque una estuviera oculta).
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [muted, setMuted] = useState(true)
  const [showDesktopNotice, setShowDesktopNotice] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Si el archivo de música no carga (enlace roto), se oculta el botón en vez de dejar uno que no hace nada.
  const [musicBroken, setMusicBroken] = useState(false)
  const hasMusic = !!music && !musicBroken

  // Solo se muestran los vídeos que has subido tú desde el admin con categoría "hero".
  // Ya no se usan las fotos de stock que trajo la plantilla de V0.
  const slideCount = videos.length

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

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
    // Respaldo por si el atributo "loop" falla en algún navegador/vídeo: al terminar,
    // lo reiniciamos nosotros mismos en vez de depender solo del navegador.
    el.onended = () => {
      el.currentTime = 0
      void el.play().catch(() => {})
    }
  }, [])

  const next = useCallback(
    () => setIndex((i) => (i + 1) % slideCount),
    [slideCount],
  )
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + slideCount) % slideCount),
    [slideCount],
  )

  const safeIndex = slideCount > 0 ? index % slideCount : 0
  const current = videos[safeIndex]
  const loading = !!current && readyId !== current.id

  // El carrusel avanza 6 segundos DESPUÉS de que el vídeo actual esté listo, no antes.
  // Así un vídeo lento no se salta mientras todavía está cargando.
  useEffect(() => {
    if (slideCount < 2 || loading) return
    const id = setTimeout(next, 6000)
    return () => clearTimeout(id)
  }, [next, loading, slideCount, safeIndex])

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
  const renderSlides = (mobile: boolean) => {
    if (videos.length === 0) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0b0e14] to-[#1a1f2b]">
          <span className="text-2xl font-extrabold tracking-wide text-white/60 sm:text-3xl">
            Drone<span className="text-[var(--gold)]">sur</span>
          </span>
        </div>
      )
    }
    // Solo se pinta la versión (móvil o escritorio) que corresponde a esta pantalla.
    if (isMobile === null || mobile !== isMobile || !current) return null

    return (
      <div className="absolute inset-0">
        {/* Solo hay UN vídeo en la página a la vez. Al cambiar de vídeo, el anterior se
            quita y se descarga el siguiente (por eso el "key"). */}
        <video
          key={current.id}
          ref={forcePlay}
          className={`h-full w-full transition-opacity duration-700 ${
            mobile ? 'object-contain' : 'object-cover'
          } ${loading ? 'opacity-0' : 'opacity-100'}`}
          src={playableVideoUrl(current.url)}
          poster={current.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setReadyId(current.id)}
          onCanPlay={() => setReadyId(current.id)}
          onPlaying={() => setReadyId(current.id)}
          onWaiting={() => setReadyId(null)}
          onError={() => {
            // Si un vídeo falla, se quita el círculo y se pasa al siguiente.
            setReadyId(current.id)
            if (slideCount > 1) next()
          }}
        />
        {loading && (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            role="status"
            aria-label="Cargando vídeo"
          >
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/25 border-t-[var(--gold)] sm:h-14 sm:w-14" />
          </div>
        )}
      </div>
    )
  }

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
    <section
      id="top"
      className="relative mt-16 w-full overflow-hidden bg-black sm:h-[calc(100svh-4rem)]"
    >
      {/* ---------- MÓVIL: caja de vídeo horizontal (estilo YouTube), sin recortar ---------- */}
      <div className="relative aspect-video w-full sm:hidden">
        {renderSlides(true)}
        <div className="pointer-events-none absolute inset-0 bg-black/10" />
        {controls(true)}
        {hasMusic && (
          <button
            onClick={toggleMute}
            className="absolute bottom-3 right-3 z-20 rounded-full border border-white/30 bg-black/40 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
            aria-label={muted ? t('hero.mute') : t('hero.unmute')}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        )}
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

        {hasMusic && (
          <button
            onClick={toggleMute}
            className="absolute bottom-6 right-6 z-20 rounded-full border border-white/30 bg-black/40 p-3 text-white backdrop-blur-sm transition hover:bg-black/70"
            aria-label={muted ? t('hero.mute') : t('hero.unmute')}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        )}

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
      {hasMusic && (
        <audio
          ref={audioRef}
          src={music}
          loop
          muted
          preload="none"
          onError={() => setMusicBroken(true)}
        />
      )}

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
