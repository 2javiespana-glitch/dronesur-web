'use client'

import './accessibility.css'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

export type A11yKey = 'reduceMotion' | 'largeText' | 'focusRing' | 'underlineLinks' | 'highContrast'
type A11ySettings = Record<A11yKey, boolean>

const DEFAULTS: A11ySettings = {
  reduceMotion: false,
  largeText: false,
  focusRing: false,
  underlineLinks: false,
  highContrast: false,
}

const STORAGE_KEY = 'dronesur-a11y'

// Clase que se pone en <html> para cada opción (los estilos están en accessibility.css).
const CLASSES: Record<A11yKey, string> = {
  reduceMotion: 'a11y-reduce-motion',
  largeText: 'a11y-large-text',
  focusRing: 'a11y-focus',
  underlineLinks: 'a11y-underline',
  highContrast: 'a11y-contrast',
}

type A11yContextValue = {
  settings: A11ySettings
  // true si el visitante lo pidió en el panel O lo tiene activado en su sistema operativo.
  reduceMotion: boolean
  setSetting: (key: A11yKey, value: boolean) => void
  reset: () => void
  panelOpen: boolean
  openPanel: () => void
  closePanel: () => void
}

const A11yContext = createContext<A11yContextValue | null>(null)

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<A11ySettings>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)
  const [systemReduce, setSystemReduce] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  // Recupera lo que el visitante eligió la última vez (si eligió algo).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<A11ySettings>
        const next = { ...DEFAULTS }
        ;(Object.keys(DEFAULTS) as A11yKey[]).forEach((k) => {
          if (typeof parsed[k] === 'boolean') next[k] = parsed[k] as boolean
        })
        setSettings(next)
      }
    } catch {
      // Sin almacenamiento o dato roto: se queda todo desactivado.
    }
    setLoaded(true)
  }, [])

  // Guarda la elección (solo después de haber leído la anterior, para no pisarla).
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Se ignora a propósito.
    }
  }, [settings, loaded])

  // Pone o quita las clases de <html> según las opciones activadas.
  useEffect(() => {
    const el = document.documentElement
    ;(Object.keys(CLASSES) as A11yKey[]).forEach((k) => {
      el.classList.toggle(CLASSES[k], settings[k])
    })
  }, [settings])

  // ¿Tiene el visitante pedido "menos movimiento" en su sistema operativo?
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setSystemReduce(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const setSetting = useCallback((key: A11yKey, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])
  const reset = useCallback(() => setSettings(DEFAULTS), [])
  const openPanel = useCallback(() => setPanelOpen(true), [])
  const closePanel = useCallback(() => setPanelOpen(false), [])

  const value = useMemo(
    () => ({
      settings,
      reduceMotion: settings.reduceMotion || systemReduce,
      setSetting,
      reset,
      panelOpen,
      openPanel,
      closePanel,
    }),
    [settings, systemReduce, setSetting, reset, panelOpen, openPanel, closePanel],
  )

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>
}

export function useA11y() {
  const ctx = useContext(A11yContext)
  if (!ctx) throw new Error('useA11y must be used within AccessibilityProvider')
  return ctx
}
