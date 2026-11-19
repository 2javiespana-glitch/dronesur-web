'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useA11y } from '@/components/accessibility-provider'
import { optimizeImage } from '@/lib/site-content'
import { playableVideoUrl, videoPosterUrl } from '@/lib/media-url'
import type { LinkMedia } from '@/lib/campaign-links'

// Carrusel de fotos y vídeos de la página de aviso de un cartel (dronesur.es/cartel2).
//  · Se desliza con el dedo o con las flechas; los puntos de abajo dicen en cuál estás.
//  · Pasa solo: las fotos a los 5 s y los vídeos cuando terminan (con un máximo de 20 s).
//    Si el visitante tiene activado «reducir movimiento», no pasa solo y los vídeos no arrancan solos.
//  · Solo suena/reproduce el vídeo que se está viendo; los demás se paran, y solo se piden al cargar los cercanos.
const IMAGE_SECONDS = 5
const VIDEO_MAX_SECONDS = 20

export function LinkCarousel({ media }: { media: LinkMedia[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [active, setActive] = useState(0)
  const [rawVideos, setRawVideos] = useState<Set<number>>(new Set()) // vídeos que no se pudieron convertir: se usa el original
  const { reduceMotion } = useA11y() // opción del panel de accesibilidad O preferencia del sistema
  const count = media.length

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current
      if (!track || count === 0) return
      const target = (index + count) % count
      // Solo se desliza suavemente al pasar a la toma de al lado. Si el salto es largo (por ejemplo, de la última a
      // la primera), se cambia directamente: así no se «activan» una a una las tomas del medio (y no se ponen a
      // reproducir ni a descargar los vídeos por los que pasaría).
      const adjacent = Math.abs(target - active) <= 1
      track.scrollTo({ left: target * track.clientWidth, behavior: reduceMotion || !adjacent ? 'auto' : 'smooth' })
      setActive(target)
    },
    [count, reduceMotion, active],
  )

  // Al deslizar con el dedo, se actualiza la diapositiva activa.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth))
        setActive((current) => (index >= 0 && index < count && index !== current ? index : current))
      })
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      track.removeEventListener('scroll', onScroll)
    }
  }, [count])

  // Solo se reproduce el vídeo activo.
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return
      if (i === active && !reduceMotion) {
        video.currentTime = 0
        void video.play().catch(() => {})
      } else {
        video.pause()
      }
    })
  }, [active, reduceMotion])

  // Pasa sola a la siguiente. Una foto espera 5 s; un vídeo pasa al terminar (o a los 20 s como máximo).
  useEffect(() => {
    if (count < 2 || reduceMotion) return
    const seconds = media[active]?.type === 'video' ? VIDEO_MAX_SECONDS : IMAGE_SECONDS
    const timer = window.setTimeout(() => goTo(active + 1), seconds * 1000)
    return () => window.clearTimeout(timer)
  }, [active, count, media, reduceMotion, goTo])

  if (count === 0) return null

  return (
    <div className="relative mt-8 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
      >
        {media.map((item, i) => (
          <div
            key={item.url}
            className="aspect-[4/3] min-w-full snap-center bg-black sm:aspect-[16/10]"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${count}`}
          >
            {item.type === 'video' ? (
              <video
                ref={(el) => {
                  videoRefs.current[i] = el
                }}
                src={rawVideos.has(i) ? item.url : playableVideoUrl(item.url, item.width ?? 1280)}
                poster={videoPosterUrl(item.url)}
                muted
                playsInline
                loop={count === 1}
                preload={Math.abs(i - active) <= 1 ? 'auto' : 'none'}
                onEnded={() => count > 1 && goTo(i + 1)}
                onError={() => setRawVideos((s) => (s.has(i) ? s : new Set(s).add(i)))}
                className="h-full w-full object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={optimizeImage(item.url, 1400)}
                alt=""
                loading={i === 0 ? 'eager' : 'lazy'}
                draggable={false}
                className="h-full w-full object-cover"
              />
            )}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            aria-label="Anterior"
            className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            aria-label="Siguiente"
            className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {media.map((item, i) => (
              <button
                key={item.url}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${i + 1} / ${count}`}
                className={`h-2 rounded-full transition-all ${i === active ? 'w-5 bg-[var(--gold)]' : 'w-2 bg-white/60'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
