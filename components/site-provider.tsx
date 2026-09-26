'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
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
const LANG_KEY = 'dronesur-lang'

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [lang, setLangState] = useState<Lang>('es')

  useEffect(() => {
    const storedTheme = (localStorage.getItem(THEME_KEY) as Theme) || 'dark'
    const storedLang = (localStorage.getItem(LANG_KEY) as Lang) || 'es'
    setTheme(storedTheme)
    setLangState(storedLang)
  }, [])

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

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    localStorage.setItem(LANG_KEY, next)
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

export function useSite() {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSite must be used within SiteProvider')
  return ctx
}
