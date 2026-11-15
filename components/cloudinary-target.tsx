'use client'

import { useEffect, useState } from 'react'
import { currentUploadTarget, subscribeUploadTarget, type UploadTarget } from '@/lib/cloudinary'

// Pequeño texto del admin que dice a qué cuenta de Cloudinary van las subidas («Cloudinary 1», «Cloudinary 2»).
// Se actualiza solo cuando una cuenta se llena y las subidas pasan a la siguiente.
export function useUploadTarget(): UploadTarget | null {
  const [target, setTarget] = useState<UploadTarget | null>(null)
  useEffect(() => {
    const update = () => setTarget(currentUploadTarget())
    update()
    return subscribeUploadTarget(update)
  }, [])
  return target
}

// Línea informativa para la parte de arriba del panel de archivos.
export function CloudinaryTarget() {
  const target = useUploadTarget()
  if (!target) return null
  return (
    <p className="text-xs text-muted-foreground">
      Las subidas van a: <span className="font-semibold text-foreground">Cloudinary {target.number}</span>
      {target.skippedFull && <> (la anterior está llena)</>}
      {target.configured < 2 && <> · la 2ª cuenta aún no está configurada</>}
    </p>
  )
}
