import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

// El archivo robots.txt: le dice a Google qué puede visitar, y dónde está el mapa del sitio.
// El panel de administración y las rutas internas (/api) se dejan fuera.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
