'use client'

import { useEffect, useRef, useState } from 'react'
import { panoramaUrl } from '@/lib/media-url'

// Visor de fotos 360° (Pannellum). Se carga solo cuando hace falta, desde cdnjs.
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

export function PanoramaViewer({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)

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
          autoRotate: -2, // gira despacio hasta que el visitante la toca
          showControls: true,
          showFullscreenCtrl: true,
          mouseZoom: true,
          hfov: 100,
          minHfov: 40,
          maxHfov: 120,
          compass: false,
        })
        viewer.on('error', () => setError(true))
      })
      .catch(() => setError(true))

    return () => {
      cancelled = true
      try {
        viewer?.destroy()
      } catch {
        // nada que hacer si ya no existe
      }
    }
  }, [url])

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        No se pudo cargar la foto 360°. Prueba a recargar la página.
      </div>
    )
  }

  return <div ref={ref} className="h-full w-full" />
}
