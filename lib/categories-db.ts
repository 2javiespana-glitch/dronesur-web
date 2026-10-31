import { CATEGORIES as SEED_CATEGORIES, type Category } from '@/lib/content'
import { readJSON } from '@/lib/kv'

// Las categorías de servicio se crean y ocultan desde el admin y se guardan en la base de
// datos. Mientras no se haya guardado nada, se usan las 5 de siempre (lib/content.ts).
// Lo usan /api/categories, /api/media, /api/albums y la página /servicios/[slug].

export const CATEGORIES_KEY = 'dronesur:categories'

export async function readCategories(): Promise<Category[]> {
  const saved = await readJSON<Category[] | null>(CATEGORIES_KEY, null)
  return Array.isArray(saved) ? saved : SEED_CATEGORIES
}

export async function categorySlugs(): Promise<string[]> {
  return (await readCategories()).map((c) => c.slug)
}
