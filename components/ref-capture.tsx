'use client'

import { useEffect } from 'react'
import { takeRef } from '@/lib/ref-param'

// Siempre montado (aunque el visitante no haya aceptado cookies): solo limpia «?ref=» de la barra de
// direcciones y recuerda el nombre en memoria. No envía nada a ningún sitio (eso lo hace visit-tracker.tsx).
export function RefCapture() {
  useEffect(() => {
    takeRef()
  }, [])
  return null
}
