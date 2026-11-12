'use client'

import { useEffect } from 'react'

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
    // Así sabes cuál de ellos te trae visitas. Solo letras, números, guion y guion bajo.
    let ref = ''
    try {
      const raw = new URLSearchParams(window.location.search).get('ref') || ''
      ref = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30)
    } catch {
      // Se ignora a propósito.
    }

    void fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, from, ref }),
      keepalive: true,
    }).catch(() => {})
  }, [])

  return null
}
