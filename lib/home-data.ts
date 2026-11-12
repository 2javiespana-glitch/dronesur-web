import { readJSONPublic } from '@/lib/kv'
import { readCategoriesPublic } from '@/lib/categories-db'
import { CATEGORIES, type Category, type VideoItem } from '@/lib/content'
import { normalizeContent, type SiteContent } from '@/lib/site-content'
import type { MediaItem } from '@/lib/media-admin'

// Todo lo que necesita la portada (/ y /en), leído UNA sola vez en el servidor y en paralelo.
// Antes, el navegador pedía estos datos uno a uno después de abrir la página (6 peticiones,
// dos de ellas repetidas). Ahora llegan ya dentro de la página.
//
// Si la base de datos falla o no está conectada, cada dato usa su valor de siempre
// (igual que hacían las rutas /api), así que la web nunca se rompe.

export type PromoOverride = {
  badgeEs: string
  titleEs: string
  textEs: string
  ctaEs: string
  badgeEn: string
  titleEn: string
  textEn: string
  ctaEn: string
  finePrintEs: string // letra pequeña bajo el descuento
  finePrintEn: string
}

// Qué secciones se ven (las casillas de "Qué se ve en la web" del admin).
export type SectionToggles = {
  promo: boolean
  coverage: boolean
  guarantee: boolean
  reviews: boolean
  legal: boolean
  about: boolean
  pilot: boolean
}

export type HomeData = {
  videos: VideoItem[] // vídeos del carrusel (categoría "hero")
  covers: Record<string, string> // portada de cada tarjeta, por slug
  categories: Category[] // solo las visibles
  settings: SectionToggles
  promoOverride: PromoOverride | null
  content: SiteContent
}

const DEFAULT_TOGGLES: SectionToggles = {
  promo: true,
  coverage: true,
  guarantee: true,
  reviews: true,
  legal: true,
  about: true,
  pilot: true,
}

const TOGGLE_KEYS = Object.keys(DEFAULT_TOGGLES) as (keyof SectionToggles)[]
const PROMO_KEYS: (keyof PromoOverride)[] = [
  'badgeEs',
  'titleEs',
  'textEs',
  'ctaEs',
  'badgeEn',
  'titleEn',
  'textEn',
  'ctaEn',
  'finePrintEs',
  'finePrintEn',
]

// Si una lectura falla, devuelve el valor de siempre en vez de romper la página.
async function safe<T>(job: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await job()
  } catch {
    return fallback
  }
}

export async function loadHomeData(): Promise<HomeData> {
  const [media, categories, savedSettings, savedContent] = await Promise.all([
    safe(() => readJSONPublic<MediaItem[]>('dronesur:media', []), [] as MediaItem[]),
    safe(() => readCategoriesPublic(), CATEGORIES),
    safe(() => readJSONPublic<Record<string, unknown>>('dronesur:settings', {}), {} as Record<string, unknown>),
    safe(() => readJSONPublic<unknown>('dronesur:content', null), null),
  ])

  const items = Array.isArray(media) ? media : []

  const visibleCategories = (Array.isArray(categories) ? categories : CATEGORIES).filter((c) => c.visible !== false)

  // Vídeos del carrusel: solo los de categoría "hero" (los antiguos sin tipo cuentan como vídeo).
  // Si el vídeo está enlazado a una categoría (y esa categoría existe y no está oculta), lleva su botón.
  const videos: VideoItem[] = items
    .filter((m) => m.category === 'hero' && (m.type === 'video' || !m.type))
    .map((m) => {
      const cat = m.linkSlug ? visibleCategories.find((c) => c.slug === m.linkSlug) : undefined
      return {
        id: m.id,
        title: m.title,
        url: m.url,
        category: m.category,
        type: m.type,
        ...(cat ? { link: { slug: cat.slug, title: cat.title } } : {}),
      }
    })

  // Portadas de las tarjetas (categoría "cover-<slug>"). La última subida gana.
  const covers: Record<string, string> = {}
  for (const m of items) {
    if (m.category?.startsWith('cover-') && (m.type === 'image' || !m.type)) {
      covers[m.category.replace('cover-', '')] = m.url
    }
  }

  // Secciones visibles: solo se leen los ajustes conocidos y con el tipo correcto.
  const settings = { ...DEFAULT_TOGGLES }
  for (const key of TOGGLE_KEYS) {
    if (typeof savedSettings?.[key] === 'boolean') settings[key] = savedSettings[key] as boolean
  }

  let promoOverride: PromoOverride | null = null
  const rawPromo = savedSettings?.promoOverride
  if (rawPromo && typeof rawPromo === 'object') {
    const po = rawPromo as Record<string, unknown>
    const clean = {} as PromoOverride
    for (const key of PROMO_KEYS) clean[key] = typeof po[key] === 'string' ? (po[key] as string) : ''
    promoOverride = clean
  }

  return {
    videos,
    covers,
    categories: visibleCategories,
    settings,
    promoOverride,
    content: normalizeContent(savedContent),
  }
}
