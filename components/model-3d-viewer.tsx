'use client'

import { createElement, useEffect, useState } from 'react'

// Visor de modelos 3D (<model-viewer> de Google). Admite archivos .glb.
// Se carga solo cuando hace falta, desde jsDelivr.
const SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js'

function loadModelViewer(): Promise<void> {
  if (typeof customElements !== 'undefined' && customElements.get('model-viewer')) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    let script = document.getElementById('model-viewer-js') as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = 'model-viewer-js'
      script.type = 'module'
      script.src = SRC
      document.head.appendChild(script)
    }
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => reject(new Error('No se pudo cargar el visor 3D')))
  })
}

export function Model3DViewer({ url, label }: { url: string; label: string }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    loadModelViewer()
      .then(() => setReady(true))
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        No se pudo cargar el modelo 3D. Prueba a recargar la página.
      </div>
    )
  }
  if (!ready) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Cargando modelo 3D…
      </div>
    )
  }

  // <model-viewer> es un elemento especial del navegador; createElement evita
  // que TypeScript se queje de que no lo conoce.
  return createElement('model-viewer', {
    src: url,
    alt: label,
    'camera-controls': '',
    'auto-rotate': '',
    'touch-action': 'pan-y',
    'shadow-intensity': '1',
    style: { width: '100%', height: '100%', backgroundColor: '#111' },
  })
}
