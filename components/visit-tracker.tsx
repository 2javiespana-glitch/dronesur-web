'use client'

import { useEffect } from 'react'
import { takeRef } from '@/lib/ref-param'

// Avisa al servidor de que ha entrado una visita (una vez por carga de la web).
// No guarda nada en el dispositivo del visitante: ni cookies ni almacenamiento local.
// Solo se monta cuando el visitante ha aceptado las estadísticas (ver analytics-gate.tsx).
export function VisitTracker() {
  useEffect(() => {
    const path = window.location.pathname
    if (path.startsWith('/admin')) return

    // Solo el dominio desde el que llega (por ejemplo instagram.com), no la dirección completa.
    let from = ''
    try {
      if (document.referrer) {
        const host = new URL(document.referrer).hostname
        if (host !== window.location.hostname) from = host
      }
    } catch {
      // Se ignora a propósito.
    }

    // Enlaces de carteles, tarjetas, QR...: dronesur.es/?ref=cartel-1 → se apunta "cartel-1".
    // Así sabes cuál de ellos te trae visitas. La dirección se limpia al entrar (ref-capture.tsx),
    // por eso el nombre se lee de la copia en memoria y no de la barra del navegador.
    const ref = takeRef()

    void fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, from, ref }),
      keepalive: true,
    }).catch(() => {})
  }, [])

  return null
}
