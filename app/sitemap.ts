import type { MetadataRoute } from 'next'
import { CATEGORIES } from '@/lib/content'
import { readCategories } from '@/lib/categories-db'
import { readJSON } from '@/lib/kv'
import { normalizeContent } from '@/lib/site-content'
import { CITIES } from '@/lib/cities'
import { SITE_URL } from '@/lib/seo'

// El mapa del sitio (dronesur.es/sitemap.xml): la lista de páginas que le ofreces a Google.
// Se genera solo, con las categorías visibles y las páginas de ciudad que ya tienen texto.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  let categories = CATEGORIES
  let cityTexts: Record<string, string> = {}
  try {
    categories = await readCategories()
    cityTexts = normalizeContent(await readJSON<unknown>('dronesur:content', null)).cities
  } catch {
    // Si la base de datos no responde, se usan las categorías de siempre y ninguna ciudad.
  }

  const visibleCategories = categories.filter((c) => c.visible !== false)

  return [
    // Portada, en español y en inglés (cada una indica cuál es su equivalente).
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
      alternates: { languages: { es: SITE_URL, en: `${SITE_URL}/en` } },
    },
    {
      url: `${SITE_URL}/en`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: { languages: { es: SITE_URL, en: `${SITE_URL}/en` } },
    },
    // Servicios, en español y en inglés.
    ...visibleCategories.flatMap((c) => {
      const es = `${SITE_URL}/servicios/${c.slug}`
      const en = `${SITE_URL}/en/services/${c.slug}`
      return [
        { url: es, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8, alternates: { languages: { es, en } } },
        { url: en, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7, alternates: { languages: { es, en } } },
      ]
    }),
    ...CITIES.filter((c) => (cityTexts[c.slug] ?? '').trim().length > 0).map((c) => ({
      url: `${SITE_URL}/dron/${c.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/aviso-legal`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/politica-de-privacidad`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/politica-de-cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
