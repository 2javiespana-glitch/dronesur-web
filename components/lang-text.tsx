'use client'

import type { ReactNode } from 'react'
import { useSite } from '@/components/site-provider'

// Muestra un contenido u otro según el idioma que haya elegido el visitante (ES / EN).
// Uso: <LangText es={<>Hola</>} en={<>Hello</>} />
export function LangText({ es, en }: { es: ReactNode; en: ReactNode }) {
  const { lang } = useSite()
  return <>{lang === 'en' ? en : es}</>
}
