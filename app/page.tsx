import type { Metadata } from 'next'
import { HomePage } from '@/components/home-page'
import { loadHomeData } from '@/lib/home-data'

// Portada en español. La versión inglesa está en /en (ver app/en/page.tsx).
// Los "alternates" le dicen a Google que son la misma página en dos idiomas.
export const metadata: Metadata = {
  alternates: {
    canonical: '/',
    languages: { es: '/', en: '/en', 'x-default': '/' },
  },
}

// La portada lee cada vez lo que has guardado en el admin (vídeos, secciones, textos), igual que
// las páginas de servicio, así que no se genera fija.
export const dynamic = 'force-dynamic'

export default async function Page() {
  const data = await loadHomeData()
  return <HomePage data={data} />
}
