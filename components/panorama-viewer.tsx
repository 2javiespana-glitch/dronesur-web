'use client'

import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import {
  Aperture,
  Camera,
  CircleDot,
  GalleryHorizontal,
  Globe,
  Maximize,
  Minimize,
  Orbit,
  Pause,
  Play,
  Rotate3d,
  RotateCcw,
} from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useA11y } from '@/components/accessibility-provider'
import {
  PanoramaProjectionViewer,
  supportsProjections,
  type ProjectionViewerHandle,
} from '@/components/panorama-projection-viewer'
import { panoramaUrl } from '@/lib/media-url'
import { VIEW_LABELS, VIEW_MODES, type ProjectionMode, type ViewMode } from '@/lib/panorama-projections'

// Visor de fotos 360°. Tiene dos motores:
//  · "POV 360" (la vista de siempre): Pannellum, cargado solo cuando hace falta desde cdnjs.
//  · Planeta, Invertido, Ojo de pez, Globo y Plano: nuestro visor WebGL (panorama-projection-viewer.tsx).
const JS = 'https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.js'
const CSS = 'https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.css'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadPannellum(): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  if (w.pannellum) return Promise.resolve(w.pannellum)

  return new Promise((resolve, reject) => {
    if (!document.getElementById('pannellum-css')) {
      const link = document.createElement('link')
      link.id = 'pannellum-css'
      link.rel = 'stylesheet'
      link.href = CSS
      document.head.appendChild(link)
    }
    let script = document.getElementById('pannellum-js') as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = 'pannellum-js'
      script.src = JS
      script.async = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', () => resolve(w.pannellum))
    script.addEventListener('error', () => reject(new Error('No se pudo cargar el visor 360°')))
  })
}

// ---------- Vista POV 360 (Pannellum) ----------
function PovViewer({ url, onError, reduceMotion }: { url: string; onError: () => void; reduceMotion: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null)
  const reduceRef = useRef(reduceMotion)
  reduceRef.current = reduceMotion

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let viewer: any = null

    loadPannellum()
      .then((pannellum) => {
        if (cancelled || !ref.current) return
        viewer = pannellum.viewer(ref.current, {
          type: 'equirectangular',
          panorama: panoramaUrl(url),
          autoLoad: true,
          autoRotate: reduceRef.current ? 0 : -2, // gira despacio hasta que el visitante la toca (nunca si pidió menos movimiento)
          showControls: true,
          showFullscreenCtrl: true,
          mouseZoom: true,
          hfov: 100,
          minHfov: 40,
          maxHfov: 120,
          compass: false,
        })
        viewerRef.current = viewer
        viewer.on('error', onError)
      })
      .catch(onError)

    return () => {
      cancelled = true
      try {
        viewer?.destroy()
      } catch {
        // nada que hacer si ya no existe
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  // Si activa «Reducir animaciones» con la foto ya abierta, se para el giro sin recargarla.
  useEffect(() => {
    if (!reduceMotion) return
    try {
      viewerRef.current?.stopAutoRotate?.()
    } catch {
      // nada que hacer si ya no existe
    }
  }, [reduceMotion])

  return <div ref={ref} className="h-full w-full" />
}

// ---------- Botones ----------
const MODE_ICONS: Record<ViewMode, ComponentType<{ className?: string }>> = {
  pov: Rotate3d,
  planet: Orbit,
  tunnel: CircleDot,
  fisheye: Aperture,
  globe: Globe,
  flat: GalleryHorizontal,
}

const TEXT = {
  loading: { es: 'Cargando vista…', en: 'Loading view…' },
  viewer: { es: 'Foto 360°', en: '360° photo' },
  views: { es: 'Tipo de vista', en: 'View type' },
  autoOn: { es: 'Activar giro automático', en: 'Start auto-rotate' },
  autoOff: { es: 'Pausar giro automático', en: 'Pause auto-rotate' },
  reset: { es: 'Reiniciar vista', en: 'Reset view' },
  save: { es: 'Guardar imagen de esta vista', en: 'Save image of this view' },
  fullscreen: { es: 'Pantalla completa', en: 'Fullscreen' },
  exitFullscreen: { es: 'Salir de pantalla completa', en: 'Exit fullscreen' },
  error: {
    es: 'No se pudo cargar la foto 360°. Prueba a recargar la página.',
    en: 'The 360° photo could not be loaded. Try reloading the page.',
  },
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded-full border border-white/30 bg-black/45 p-2 text-white backdrop-blur-sm transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
    >
      {children}
    </button>
  )
}

export function PanoramaViewer({ url }: { url: string }) {
  const { lang } = useSite()
  const { reduceMotion } = useA11y() // opción del panel de accesibilidad O preferencia del sistema
  const tx = (key: keyof typeof TEXT) => TEXT[key][lang === 'en' ? 'en' : 'es']

  const rootRef = useRef<HTMLDivElement>(null)
  const projectionRef = useRef<ProjectionViewerHandle>(null)

  const [mode, setMode] = useState<ViewMode>('pov')
  const [autoRotate, setAutoRotate] = useState(true)
  const [canProject, setCanProject] = useState(false) // se comprueba en el navegador (WebGL2)
  const [canFullscreen, setCanFullscreen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setCanProject(supportsProjections())
    setCanFullscreen(!!document.fullscreenEnabled)

    const onChange = () => setIsFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Quien tiene activado "reducir movimiento" (en el panel o en su sistema) no quiere que la foto gire sola.
  useEffect(() => {
    if (reduceMotion) setAutoRotate(false)
  }, [reduceMotion])

  const toggleFullscreen = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void root.requestFullscreen?.()
  }, [])

  const saveImage = useCallback(async () => {
    const blob = await projectionRef.current?.capture()
    if (!blob) return
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `dronesur-360-${mode}.png`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }, [mode])

  // Si algo falla en las proyecciones se vuelve a la vista de siempre y se ocultan los botones nuevos.
  const projectionFailed = useCallback(() => {
    setCanProject(false)
    setMode('pov')
  }, [])

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {tx('error')}
      </div>
    )
  }

  const projectionMode: ProjectionMode | null = mode === 'pov' ? null : mode

  return (
    <div ref={rootRef} className="relative h-full w-full bg-black">
      {projectionMode ? (
        <PanoramaProjectionViewer
          ref={projectionRef}
          url={url}
          mode={projectionMode}
          autoRotate={autoRotate}
          label={`${tx('viewer')} · ${VIEW_LABELS[mode][lang === 'en' ? 'en' : 'es']}`}
          loadingLabel={tx('loading')}
          onUserInteract={() => setAutoRotate(false)}
          onError={projectionFailed}
        />
      ) : (
        <PovViewer url={url} onError={() => setError(true)} reduceMotion={reduceMotion} />
      )}

      {canProject && (
        <>
          {/* Herramientas (arriba a la derecha; los botones de zoom de Pannellum van a la izquierda) */}
          <div className="absolute right-3 top-3 z-10 flex gap-2">
            {projectionMode && (
              <>
                <ToolButton
                  label={autoRotate ? tx('autoOff') : tx('autoOn')}
                  onClick={() => setAutoRotate((v) => !v)}
                >
                  {autoRotate ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </ToolButton>
                <ToolButton label={tx('reset')} onClick={() => projectionRef.current?.reset()}>
                  <RotateCcw className="h-4 w-4" />
                </ToolButton>
                <ToolButton label={tx('save')} onClick={saveImage}>
                  <Camera className="h-4 w-4" />
                </ToolButton>
              </>
            )}
            {/* En POV 360 la pantalla completa la da Pannellum (botón de la izquierda) */}
            {projectionMode && canFullscreen && (
              <ToolButton
                label={isFullscreen ? tx('exitFullscreen') : tx('fullscreen')}
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </ToolButton>
            )}
          </div>

          {/* Selector de vista */}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-2">
            <div
              role="group"
              aria-label={tx('views')}
              className="pointer-events-auto flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-white/20 bg-black/55 p-1 backdrop-blur-md [scrollbar-width:none]"
            >
              {VIEW_MODES.map((id) => {
                const Icon = MODE_ICONS[id]
                const active = id === mode
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setMode(id)}
                    className={`flex min-w-[3.6rem] shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] ${
                      active ? 'bg-white/15 text-[var(--gold)]' : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {VIEW_LABELS[id][lang === 'en' ? 'en' : 'es']}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
