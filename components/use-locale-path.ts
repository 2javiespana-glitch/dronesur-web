'use client'

import { useCallback } from 'react'
import { useSite } from '@/components/site-provider'
import { toEnglishPath } from '@/lib/i18n-routes'

// Devuelve una función que, dada una dirección de la web, da la del idioma actual.
// Ej.: en español "/servicios/aerea" se queda igual; en inglés pasa a "/en/services/aerea".
export function useLocalePath() {
  const { lang } = useSite()
  return useCallback((path: string) => (lang === 'en' ? toEnglishPath(path) : path), [lang])
}
