'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { type Lang, translate } from '@/lib/content'

type Theme = 'light' | 'dark'

type SiteContextValue = {
  theme: Theme
  lang: Lang
  toggleTheme: () => void
  setLang: (lang: Lang) => void
  toggleLang: () => void
  t: (key: string) => string
  tl: (value: { es: string; en: string }) => string
}

const SiteContext = createContext<SiteContextValue | null>(null)

const THEME_KEY = 'dronesur-theme'

// El idioma lo decide la dirección de la página: /en y todo lo que cuelga de /en está en inglés; el resto,
// en español. Ya no se recuerda en el navegador (antes una visita a /en hacía que la dirección en español
// se mostrara en inglés). El botón ES/EN de la cabecera es lo que lleva de una a otra.
function langFromPath(pathname: string | null): Lang {
  return pathname === '/en' || pathname?.startsWith('/en/') ? 'en' : 'es'
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [theme, setTheme] = useState<Theme>('dark')
  const [lang, setLangState] = useState<Lang>(() => langFromPath(pathname))

  useEffect(() => {
    setTheme((localStorage.getItem(THEME_KEY) as Theme) || 'dark')
  }, [])

  // Cada vez que se cambia de página, el idioma vuelve al que corresponde a su dirección.
  useEffect(() => {
    const next = langFromPath(pathname)
    setLangState(next)
    document.documentElement.setAttribute('lang', next)
  }, [pathname])

  const applyTheme = useCallback((next: Theme) => {
    const el = document.documentElement
    el.classList.remove('light', 'dark')
    el.classList.add(next)
    localStorage.setItem(THEME_KEY, next)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      return next
    })
  }, [applyTheme])

  // Solo cambia el texto de la página actual (para las páginas que no tienen versión en el otro idioma,
  // como las legales). No se guarda: al cambiar de página vuelve al idioma de su dirección.
  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    document.documentElement.setAttribute('lang', next)
  }, [])

  const toggleLang = useCallback(() => {
    setLang(lang === 'es' ? 'en' : 'es')
  }, [lang, setLang])

  const t = useCallback((key: string) => translate(key, lang), [lang])
  const tl = useCallback(
    (value: { es: string; en: string }) => value[lang],
    [lang],
  )

  return (
    <SiteContext.Provider
      value={{ theme, lang, toggleTheme, setLang, toggleLang, t, tl }}
    >
      {children}
    </SiteContext.Provider>
  )
}

// Fuerza el idioma de una zona de la web. Se usa en las páginas /en: el texto se genera ya en inglés
// en el servidor (así Google ve inglés).
export function LangOverride({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const parent = useSite()
  const { setLang: setParentLang } = parent

  useEffect(() => {
    setParentLang(lang)
  }, [lang, setParentLang])

  const value = useMemo<SiteContextValue>(
    () => ({
      ...parent,
      lang,
      t: (key: string) => translate(key, lang),
      tl: (v: { es: string; en: string }) => v[lang],
    }),
    [parent, lang],
  )

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSite() {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSite must be used within SiteProvider')
  return ctx
}
