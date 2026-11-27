'use client'

import { useCallback } from 'react'
import { useSite } from '@/components/site-provider'
import { belongsToSite, joinUal, splitUal, toEnglishPath } from '@/lib/i18n-routes'

// Devuelve una función que, dada una dirección de la web, da la del idioma actual.
// Ej.: en español "/servicios/aerea" se queda igual; en inglés pasa a "/en/services/aerea".
// Si estás en la cara /ual, además mantiene el «/ual» para que no se salga de ella:
// "/servicios/aerea" pasa a "/ual/servicios/aerea". Las páginas legales no cambian.
export function useLocalePath() {
  const { lang, isUal } = useSite()
  return useCallback(
    (path: string) => {
      const localized = lang === 'en' ? toEnglishPath(path) : path
      if (!isUal) return localized
      const { ual, rest } = splitUal(localized)
      return !ual && belongsToSite(rest) ? joinUal(rest) : localized
    },
    [lang, isUal],
  )
}
