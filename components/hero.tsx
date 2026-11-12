'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useA11y } from '@/components/accessibility-provider'
import { useLocalePath } from '@/components/use-locale-path'
import type { VideoItem } from '@/lib/content'
import { MOBILE_VIDEO_WIDTH, playableVideoUrl } from '@/lib/media-url'

type HeroProps = {
  videos: VideoItem[]
  music?: string // dirección de la música (se pone desde el admin); vacío = sin música
}

export function Hero({ videos, music }: HeroProps) {
  const { t, lang } = useSite()
  const localePath = useLocalePath()
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
  // true = el aparato es un móvil (pantalla táctil con el lado corto menor de 640 px), esté en
  // vertical o en horizontal. Una tablet NO cuenta como móvil. Sirve para elegir la CALIDAD del
  // vídeo: así, al girar el móvil, se sigue usando el mismo vídeo ligero (misma dirección) y el
  // navegador reutiliza lo que ya había descargado en vez de bajar otra versión más pesada.
  const [phoneDevice, setPhoneDevice] = useState(false)
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
    setPhoneDevice(
      window.matchMedia('(pointer: coarse)').matches && Math.min(window.screen.width, window.screen.height) < 640,
    )
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

  // Botón hacia la categoría del vídeo que se está viendo (si ese vídeo tiene una enlazada en el admin).
  const catLink = current?.link
  const catName = catLink ? ((lang === 'en' ? catLink.title.en : catLink.title.es) || catLink.title.es) : ''
  const catButton = (className: string) =>
    catLink ? (
      <Link
        key={current.id}
        href={localePath(`/servicios/${catLink.slug}`)}
        className={`animate-fade-up inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-[var(--gold)] bg-black/50 font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-[var(--gold)] hover:text-[var(--gold-foreground)] ${className}`}
      >
        <span className="truncate">
          {lang === 'en' ? 'View' : 'Ver'} {catName}
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
      </Link>
    ) : null
  const loading = !!current && ((!ready[current.id] && !full[current.id]) || stalledId === current.id)

  // Cola de descarga: primero el vídeo actual, luego el siguiente, el siguiente...
  // Un vídeo solo empieza a descargarse cuando los que van antes ya terminaron, con una excepción: el
  // SIGUIENTE empieza en cuanto el actual ya se puede ver (así está listo antes de que le toque).
  // Como mucho se descargan dos a la vez, sin pelearse por la conexión.
  // IMPORTANTE: un vídeo que ya empezó a cargarse se queda cargado hasta que se cierra la página. Antes,
  // al avanzar, la cola le quitaba el enlace y el navegador tiraba lo descargado (había que volver a bajarlo
  // y salía el círculo de carga al pasar a él).
  const started = useRef<Record<string, boolean>>({})
  const canLoad = (i: number) => {
    const id = videos[i].id
    if (started.current[id]) return true
    const offset = (i - safeIndex + slideCount) % slideCount
    let ok = true
    for (let o = 0; o < offset && ok; o++) {
      const v = videos[(safeIndex + o) % slideCount]
      ok = o === offset - 1 ? !!(ready[v.id] || full[v.id]) : !!full[v.id]
    }
    if (ok) started.current[id] = true
    return ok
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
  // La cuenta atrás NO se reinicia por las paradas breves del vídeo (por ejemplo, al repetirse un vídeo
  // corto): antes, un vídeo de menos de 6 s reiniciaba la cuenta en cada vuelta y el carrusel se quedaba
  // en él para siempre. Si en el momento de pasar el vídeo está parado cargando, espera un segundo y reintenta.
  // Tampoco pasa a la siguiente toma hasta que esa esté lista (como mucho espera 20 s extra): así, al cambiar,
  // salta directamente sin enseñar el círculo de carga. Las flechas y los puntos siguen funcionando al momento.
  const currentReady = !!current && (!!ready[current.id] || !!full[current.id])
  const stalledNow = useRef<string | null>(null)
  stalledNow.current = stalledId
  const readyNow = useRef({ ready, full })
  readyNow.current = { ready, full }
  const currentId = current?.id
  useEffect(() => {
    if (slideCount < 2 || !currentReady || paused) return
    let id: ReturnType<typeof setTimeout>
    let extra = 0
    const tick = () => {
      if (stalledNow.current === currentId) {
        id = setTimeout(tick, 1000)
        return
      }
      const upcoming = videos[(safeIndex + 1) % slideCount]
      const upcomingReady = !!upcoming && (readyNow.current.ready[upcoming.id] || readyNow.current.full[upcoming.id])
      if (!upcomingReady && extra < 20000) {
        extra += 500
        id = setTimeout(tick, 500)
        return
      }
      next()
    }
    id = setTimeout(tick, 6000)
    return () => clearTimeout(id)
  }, [next, currentReady, currentId, paused, slideCount, safeIndex, videos])

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
    // Vídeo ligero (1280 px) en móviles (en cualquier orientación) y en ventanas estrechas.
    const lightVideo = mobile || phoneDevice

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
                    ? playableVideoUrl(v.url, lightVideo && !fullQuality[v.id] ? MOBILE_VIDEO_WIDTH : undefined)
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
                onWaiting={(e) => {
                  // Al repetirse un vídeo en bucle el navegador avisa de una espera mínima: no es una carga a medias.
                  const el = e.currentTarget
                  if (el.currentTime < 0.3 || (el.duration && el.duration - el.currentTime < 0.3)) return
                  if (isCurrent) setStalledId(v.id)
                }}
                onError={(e) => {
                  // Si un vídeo falla, se da por terminado para que siga la cola y,
                  // si era el que se estaba viendo, se salta al siguiente.
                  if (!e.currentTarget.getAttribute('src')) return
                  // Si falló la copia reducida del móvil, antes de darlo por perdido se prueba
                  // con el vídeo de siempre.
                  if (lightVideo && !fullQuality[v.id] && playableVideoUrl(v.url, MOBILE_VIDEO_WIDTH) !== playableVideoUrl(v.url)) {
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

  // Los puntos del carrusel (barra de progreso), reutilizados en las dos versiones.
  const dots = (compact: boolean) =>
    Array.from({ length: slideCount }).map((_, i) => (
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
      {compact ? (
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2">{dots(true)}</div>
      ) : (
        // Escritorio: fila inferior con «Ver servicios» a la izquierda de los puntos y «Ver (categoría)» a la derecha.
        // Los puntos quedan siempre en el centro; los botones, pegados a ellos.
        <div className="pointer-events-none absolute inset-x-0 bottom-7 z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-5 px-28">
          <div className="pointer-events-auto flex min-w-0 justify-end">
            <a
              href="#servicios"
              className="animate-fade-up rounded-full border border-white/40 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              {t('hero.services')}
            </a>
          </div>
          <div className="pointer-events-auto flex gap-2">{dots(false)}</div>
          <div className="pointer-events-auto flex min-w-0 justify-start">{catButton('px-3.5 py-1.5 text-xs')}</div>
        </div>
      )}
    </>
  )

  return (
    <section
      id="top"
      onPointerDown={revealOnTouch}
      className="group relative mt-16 w-full overflow-hidden bg-black sm:h-[calc(100svh-4rem)] sm:min-h-[32rem]"
    >
      {/* ---------- MÓVIL: caja de vídeo horizontal (estilo YouTube), sin recortar ---------- */}
      <div className="relative aspect-video w-full sm:hidden">
        {renderSlides(true)}
        <div className="pointer-events-none absolute inset-0 bg-black/10" />
        {controls(true)}
        {catLink && <div className="absolute bottom-7 left-3 z-20 max-w-[70%]">{catButton('px-3 py-1.5 text-xs')}</div>}
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
        <a
          href="#servicios"
          className="rounded-full border border-white/40 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
        >
          {t('hero.services')}
        </a>
      </div>

      {/* ---------- ESCRITORIO: igual que siempre, vídeo a pantalla completa con el texto encima ---------- */}
      <div className="absolute inset-0 hidden sm:block">
        {renderSlides(false)}
        <div className="pointer-events-none absolute inset-0 bg-black/40" />
        <div className="pointer-events-none absolute inset-0 bg-hero-fade" />

        <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-end px-4 pb-24 text-center">
          <h1 className="animate-fade-up text-balance text-3xl font-extrabold leading-tight text-white drop-shadow-lg sm:text-4xl md:text-[2.6rem] lg:text-[3.25rem]">
            {t('hero.title')}
          </h1>
          <p className="animate-fade-up mt-3 max-w-2xl text-pretty text-[0.95rem] text-white/85 drop-shadow md:text-base">
            {t('hero.subtitle')}
          </p>
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
            {lang === 'en'
              ? 'This site is best viewed on a computer. On mobile, some parts may look different.'
              : 'Este sitio está optimizado para verse en ordenador. En móvil algunas partes pueden verse distintas.'}
          </p>
          <button
            onClick={() => setShowDesktopNotice(false)}
            className="shrink-0 rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/90 transition hover:bg-white/10"
            aria-label={lang === 'en' ? 'Close notice' : 'Cerrar aviso'}
          >
            {lang === 'en' ? 'Got it' : 'Entendido'}
          </button>
        </div>
      )}
    </section>
  )
}
