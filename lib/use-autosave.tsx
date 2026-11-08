'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Guardado automático para el panel de admin.
//
// Un panel le pasa su contenido (`value`) y una función `save`. El hook:
//   - guarda solo cuando el contenido ha cambiado respecto a lo último guardado (nunca al abrir);
//   - espera `delay` ms desde el último cambio (para no guardar en cada letra);
//   - guarda también al cerrar la pestaña/ventana, al ocultarla y al salir del panel (con `keepalive`,
//     para que el navegador termine el envío aunque la página se cierre);
//   - se puede forzar desde fuera con `flushAllAutosaves()` (lo usa el botón «Salir»).

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

type SaveFn<T> = (value: T, opts: { keepalive: boolean }) => Promise<string | null> // devuelve un error, o null si fue bien

const registry = new Set<() => Promise<boolean>>()

// Guarda ahora mismo todo lo que esté pendiente en cualquier panel.
// Devuelve true si todo quedó guardado (o no había nada pendiente) y false si algún guardado falló.
export async function flushAllAutosaves(): Promise<boolean> {
  const results = await Promise.all([...registry].map((flush) => flush().catch(() => false)))
  return results.every(Boolean)
}

export function useAutoSave<T>({
  value,
  save,
  enabled = true,
  delay = 1500,
}: {
  value: T
  save: SaveFn<T>
  // false = no guarda nada (por ejemplo mientras se cargan los datos). La primera vez que pasa a true
  // se toma como «lo guardado» lo que haya en ese momento.
  enabled?: boolean
  delay?: number
}) {
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const snapshot = JSON.stringify(value)
  const valueRef = useRef(value)
  valueRef.current = value
  const saveRef = useRef(save)
  saveRef.current = save
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const baseline = useRef<string | null>(null) // lo último que se sabe que está guardado
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef<Promise<void> | null>(null)
  const mounted = useRef(true)

  const flush = useCallback(async (keepalive = false): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    // Si ya hay un guardado en marcha se espera a que termine (salvo al cerrar la ventana, que no hay tiempo).
    if (inFlight.current && !keepalive) await inFlight.current.catch(() => undefined)
    if (!enabledRef.current || baseline.current === null) return true

    const toSave = valueRef.current
    const snap = JSON.stringify(toSave)
    if (snap === baseline.current) return true

    let ok = false
    const run = (async () => {
      if (mounted.current) {
        setStatus('saving')
        setError(null)
      }
      let problem: string | null
      try {
        problem = await saveRef.current(toSave, { keepalive })
      } catch {
        problem = 'No se pudo guardar. Revisa tu conexión.'
      }
      if (!problem) baseline.current = snap
      ok = !problem
      if (mounted.current) {
        setStatus(problem ? 'error' : 'saved')
        setError(problem)
      }
    })()
    inFlight.current = run
    try {
      await run
    } finally {
      if (inFlight.current === run) inFlight.current = null
    }
    return ok
  }, [])

  // Cada cambio programa un guardado; si el contenido vuelve a ser igual a lo guardado, no hace falta.
  useEffect(() => {
    if (!enabled) return
    if (baseline.current === null) {
      baseline.current = snapshot
      return
    }
    if (snapshot === baseline.current) {
      setStatus((s) => (s === 'pending' ? 'idle' : s))
      return
    }
    setStatus('pending')
    timer.current = setTimeout(() => void flush(false), delay)
    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
      }
    }
  }, [snapshot, enabled, delay, flush])

  // Guardar al cerrar la ventana, al ocultarla, al salir del panel y cuando lo pida «Salir».
  useEffect(() => {
    mounted.current = true
    const task = () => flush(false)
    registry.add(task)
    const onHide = () => void flush(true)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flush(true)
    }
    window.addEventListener('pagehide', onHide)
    window.addEventListener('beforeunload', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      registry.delete(task)
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('beforeunload', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
      void flush(true) // al salir del panel
      mounted.current = false
    }
  }, [flush])

  return { status, error, flush }
}

// El texto pequeño que sustituye al botón de guardar.
export function AutoSaveStatus({
  status,
  error,
  className = '',
}: {
  status: AutoSaveStatus
  error?: string | null
  className?: string
}) {
  if (status === 'idle') {
    return <span className={`text-xs text-muted-foreground ${className}`}>Se guarda solo al editar</span>
  }
  if (status === 'error') {
    return <span className={`text-sm text-destructive ${className}`}>{error || 'No se pudo guardar.'}</span>
  }
  const text =
    status === 'saving' ? 'Guardando…' : status === 'saved' ? 'Guardado ✓' : 'Cambios sin guardar…'
  return <span className={`text-sm text-muted-foreground ${className}`}>{text}</span>
}
