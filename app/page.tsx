import type { Metadata } from 'next'
import { HomePage } from '@/components/home-page'

// Portada en español. La versión inglesa está en /en (ver app/en/page.tsx).
// Los "alternates" le dicen a Google que son la misma página en dos idiomas.
export const metadata: Metadata = {
  alternates: {
    canonical: '/',
    languages: { es: '/', en: '/en', 'x-default': '/' },
  },
}

export default function Page() {
  return <HomePage />
}
