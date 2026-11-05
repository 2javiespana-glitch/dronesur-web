import { SITE } from '@/lib/content'

// Las ciudades donde das servicio. Salen de SITE.coverage (lib/content.ts): si añades una ciudad
// allí, aparece aquí sola. Cada una puede tener su propia página (dronesur.es/dron/<ciudad>),
// pero SOLO se publica cuando tú escribes su texto en el admin ("Páginas por ciudad").

export type City = { slug: string; name: string }

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const CITIES: City[] = SITE.coverage.map((name) => ({ name, slug: slugify(name) }))

export function findCity(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug)
}
