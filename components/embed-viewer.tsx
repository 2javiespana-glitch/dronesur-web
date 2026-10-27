'use client'

import { useState } from 'react'
import { embedProvider, toEmbedUrl } from '@/lib/media-url'

// Contenido interactivo de otra web (Sketchfab, Kuula, Matterport).
// No se carga hasta que el visitante lo pide: esas webs pueden usar cookies propias
// y recibir su dirección IP, así que antes se le avisa.
export function EmbedViewer({ url, label }: { url: string; label: string }) {
  const [loaded, setLoaded] = useState(false)
  const provider = embedProvider(url)

  if (!loaded) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-black/60 p-6 text-center">
        <p className="text-sm font-semibold">Contenido interactivo de {provider}</p>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          Se muestra desde una web externa. Al cargarlo, {provider} puede usar cookies y recibir tu
          dirección IP.
        </p>
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="rounded-full bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)]"
        >
          Cargar contenido interactivo
        </button>
      </div>
    )
  }

  return (
    <iframe
      src={toEmbedUrl(url)}
      title={label}
      className="h-full w-full border-0"
      allow="fullscreen; xr-spatial-tracking; autoplay"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  )
}
