import { CATEGORIES as SEED_CATEGORIES, type Category } from '@/lib/content'
import { readJSON, readJSONPublic } from '@/lib/kv'

// Las categorías de servicio se crean y ocultan desde el admin y se guardan en la base de
// datos. Mientras no se haya guardado nada, se usan las 5 de siempre (lib/content.ts).
// Lo usan /api/categories, /api/media, /api/albums y la página /servicios/[slug].

export const CATEGORIES_KEY = 'dronesur:categories'

export async function readCategories(): Promise<Category[]> {
  const saved = await readJSON<Category[] | null>(CATEGORIES_KEY, null)
  return Array.isArray(saved) ? saved : SEED_CATEGORIES
}

// Igual que readCategories, pero para las páginas públicas: lectura rápida con copia de hasta 60 s
// (se renueva al instante cuando guardas cambios desde el admin).
export async function readCategoriesPublic(): Promise<Category[]> {
  const saved = await readJSONPublic<Category[] | null>(CATEGORIES_KEY, null)
  return Array.isArray(saved) ? saved : SEED_CATEGORIES
}

export async function categorySlugs(): Promise<string[]> {
  return (await readCategories()).map((c) => c.slug)
}
