'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useQuote } from '@/components/quote-modal'
import { useA11y } from '@/components/accessibility-provider'
import type { VideoItem } from '@/lib/content'
import { playableVideoUrl } from '@/lib/media-url'

// Ancho máximo del vídeo en móvil. La caja del móvil mide unos 390 px; en pantallas 3x son
// ~1170 px reales, así que 1280 se ve igual de nítido y descarga mucho menos.
const MOBILE_VIDEO_WIDTH = 1280

type HeroProps = {
  videos: VideoItem[]
  music?: string // dirección de la música (se pone desde el admin); vacío = sin música
}

export function Hero({ videos, music }: HeroProps) {
  const { t, lang } = useSite()
  const { open } = useQuote()
  const { reduceMotion } = useA11y()
  const [index, setIndex] = useState(0)
  // Pausa del carrusel. Mientras el visitante no pulse el botón, manda su ajuste de
  // "reducir animaciones" (panel de accesibilidad o sistema operativo); si no, se reproduce como siempre.
  const [userPaused, setUserPaused] = useState<boolean | null>(null)
  const paused = userPaused ?? reduceMotion
  // En pantallas táctiles no hay "pasar el ratón": el botón aparece 3 segundos al tocar el carrusel.
  const [touchReveal, setTouchReveal] = useState(false)
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const revealOnTouch = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return
    setTouchReveal(true)
    if (touchTimer.current) clearTimeout(touchTimer.current)
    touchTimer.current = setTimeout(() => setTouchReveal(false), 3000)
  }
  useEffect(
    () => () => {
      if (touchTimer.current) clearTimeout(touchTimer.current)
    },
    [],
  )
  // ready = el vídeo ya puede empezar a verse. full = ya está descargado lo suficiente
  // como para verse entero sin cortes (o ha fallado); entonces se pasa a descargar el siguiente.
  const [ready, setReady] = useState<Record<string, boolean>>({})
  const [full, setFull] = useState<Record<string, boolean>>({})
  // Id del vídeo actual si se ha quedado a medias cargando (círculo de carga a mitad de vídeo).
  const [stalledId, setStalledId] = useState<string | null>(null)
  // Vídeos para los que la versión reducida del móvil falló: se vuelven a pedir como siempre.
  const [fullQuality, setFullQuality] = useState<Record<string, boolean>>({})
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
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
  const loading = !!current && ((!ready[current.id] && !full[current.id]) || stalledId === current.id)

  // Cola de descarga: primero el vídeo actual, luego el siguiente, el siguiente...
  // Un vídeo solo empieza a descargarse cuando todos los que van antes ya terminaron.
  // Así se descargan de uno en uno (sin pelearse por la conexión) y no hay que esperar al pasarlos.
  const canLoad = (i: number) => {
    const offset = (i - safeIndex + slideCount) % slideCount
    if (offset === 0) return true
    for (let o = 0; o < offset; o++) {
      const v = videos[(safeIndex + o) % slideCount]
      if (!full[v.id]) return false
    }
    return true
  }

  // Solo el vídeo actual se reproduce; los demás se quedan en pausa, ya cargados y listos.
  useEffect(() => {
    videos.forEach((v) => {
      const el = videoRefs.current[v.id]
      if (!el) return
      if (v.id === current?.id) {
        el.muted = true
        if (paused) el.pause()
        else void el.play().catch(() => {})
      } else {
        el.pause()
        try {
          el.currentTime = 0
        } catch {}
      }
    })
  }, [videos, current?.id, isMobile, paused])

  // El carrusel avanza 6 segundos DESPUÉS de que el vídeo actual esté listo, no antes.
  useEffect(() => {
    if (slideCount < 2 || loading || paused) return
    const id = setTimeout(next, 6000)
    return () => clearTimeout(id)
  }, [next, loading, paused, slideCount, safeIndex])

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
    if (isMobile === null || mobile !== isMobile) return null

    return (
      <>
        {videos.map((v, i) => {
          const isCurrent = i === safeIndex
          return (
            <div
              key={v.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                isCurrent ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden={!isCurrent}
            >
              <video
                ref={(el) => {
                  videoRefs.current[v.id] = el
                  if (el) el.muted = true
                }}
                className={`h-full w-full ${mobile ? 'object-contain' : 'object-cover'}`}
                // Sin "src" = todavía no le toca descargarse. Al tocarle, se pone el enlace.
                // En móvil se pide una copia reducida a 1280 px de ancho (se ve igual de nítida en
                // la pantalla y pesa mucho menos). En escritorio, el vídeo igual que siempre.
                src={
                  canLoad(i)
                    ? playableVideoUrl(v.url, mobile && !fullQuality[v.id] ? MOBILE_VIDEO_WIDTH : undefined)
                    : undefined
                }
                poster={v.poster}
                muted
                loop
                playsInline
                preload="auto"
                onCanPlay={(e) => {
                  setReady((r) => (r[v.id] ? r : { ...r, [v.id]: true }))
                  if (stalledId === v.id) setStalledId(null)
                  if (isCurrent && !paused) void e.currentTarget.play().catch(() => {})
                }}
                onCanPlayThrough={() => setFull((f) => (f[v.id] ? f : { ...f, [v.id]: true }))}
                onPlaying={() => {
                  if (stalledId === v.id) setStalledId(null)
                }}
                onWaiting={() => {
                  if (isCurrent) setStalledId(v.id)
                }}
                onError={(e) => {
                  // Si un vídeo falla, se da por terminado para que siga la cola y,
                  // si era el que se estaba viendo, se salta al siguiente.
                  if (!e.currentTarget.getAttribute('src')) return
                  // Si falló la copia reducida del móvil, antes de darlo por perdido se prueba
                  // con el vídeo de siempre.
                  if (mobile && !fullQuality[v.id] && playableVideoUrl(v.url, MOBILE_VIDEO_WIDTH) !== playableVideoUrl(v.url)) {
                    setFullQuality((f) => ({ ...f, [v.id]: true }))
                    return
                  }
                  setReady((r) => ({ ...r, [v.id]: true }))
                  setFull((f) => ({ ...f, [v.id]: true }))
                  if (isCurrent && slideCount > 1) next()
                }}
              />
            </div>
          )
        })}
        {loading && (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            role="status"
            aria-label="Cargando vídeo"
          >
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/25 border-t-[var(--gold)] sm:h-14 sm:w-14" />
          </div>
        )}
      </>
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
      onPointerDown={revealOnTouch}
      className="group relative mt-16 w-full overflow-hidden bg-black sm:h-[calc(100svh-4rem)]"
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

      {/* Pausa del carrusel y los vídeos: invisible hasta que pasas el ratón por encima (o tocas en el móvil).
          Con el teclado también se puede alcanzar con Tab. */}
      {slideCount > 0 && (
        <button
          type="button"
          onClick={() => setUserPaused(!paused)}
          aria-pressed={paused}
          aria-label={
            lang === 'en'
              ? paused
                ? 'Resume carousel and videos'
                : 'Pause carousel and videos'
              : paused
                ? 'Reanudar carrusel y vídeos'
                : 'Pausar carrusel y vídeos'
          }
          className={`absolute right-3 top-3 z-30 rounded-full border border-white/30 bg-black/50 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/80 focus-visible:opacity-100 group-hover:opacity-100 sm:right-4 sm:top-4 sm:p-2 ${
            touchReveal ? 'opacity-100' : 'opacity-0 [@media(hover:none)]:pointer-events-none'
          }`}
        >
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
      )}

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
