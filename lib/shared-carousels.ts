// Carruseles de la web que una página de cartel (dronesur.es/<nombre>) puede REUTILIZAR marcando una casilla en el
// admin («Carteles y enlaces»), en vez de subir otra vez las mismas fotos y vídeos.
//
// Un enlace no guarda copias: solo guarda QUÉ carruseles usa (por ejemplo ['hero', 'showcase']). Al abrir la página
// se leen las fotos y vídeos que tiene ese carrusel en ese momento, así que si cambias el carrusel del inicio, todas
// las páginas de carteles que lo usan se actualizan solas, y no se duplica nada en Cloudinary.
//
// Para añadir otro carrusel en el futuro: apúntalo en SHARED_CAROUSELS y en carouselMedia(); el admin y la página
// lo recogen solos.

import type { LinkMedia } from '@/lib/campaign-links'
import type { MediaItem } from '@/lib/media-admin'
import { MOBILE_VIDEO_WIDTH } from '@/lib/media-url'
import { SHOWCASE_CATEGORY, SHOWCASE_MAX_ITEMS, SHOWCASE_VIDEO_WIDTH } from '@/lib/showcase'

export type SharedCarouselId = 'hero' | 'showcase'

export const SHARED_CAROUSELS: { id: SharedCarouselId; label: string; hint: string }[] = [
  { id: 'hero', label: 'Carrusel 1 · Inicio', hint: 'Los vídeos del carrusel de la portada de la web.' },
  {
    id: 'showcase',
    label: 'Carrusel 2 · Oferta',
    hint: 'Las fotos y vídeos de la sección «oportunidad», la que va debajo del banner de descuento.',
  },
]

// Máximo de fotos y vídeos en total en una página de cartel (propias + reutilizadas).
export const MAX_LINK_TOTAL = 24

const IDS = SHARED_CAROUSELS.map((c) => c.id)

// Deja solo ids conocidos, sin repetir (lo que llegue de la base de datos o del admin).
export function normalizeCarouselIds(raw: unknown): SharedCarouselId[] {
  if (!Array.isArray(raw)) return []
  return IDS.filter((id) => raw.includes(id))
}

// Las fotos y vídeos que tiene ahora mismo un carrusel de la web, en el orden del admin.
// «width» es el ancho de vídeo que ese carrusel ya tiene preparado en Cloudinary, para no generar otra copia.
export function carouselMedia(id: SharedCarouselId, items: MediaItem[]): LinkMedia[] {
  if (id === 'hero') {
    // Igual que el carrusel del inicio: solo vídeos (los antiguos sin tipo cuentan como vídeo).
    return items
      .filter((m) => m.category === 'hero' && (m.type === 'video' || !m.type) && m.url.startsWith('https://'))
      .map((m) => ({ url: m.url, type: 'video' as const, width: MOBILE_VIDEO_WIDTH }))
  }
  return items
    .filter((m) => m.category === SHOWCASE_CATEGORY && (m.type === 'image' || m.type === 'video') && m.url.startsWith('https://'))
    .slice(0, SHOWCASE_MAX_ITEMS)
    .map((m) =>
      m.type === 'video'
        ? { url: m.url, type: 'video' as const, width: SHOWCASE_VIDEO_WIDTH }
        : { url: m.url, type: 'image' as const },
    )
}

// Lista final de la página de cartel: primero las fotos y vídeos propios del cartel y después los de los carruseles
// marcados (en el orden de SHARED_CAROUSELS). Sin repetir y con un tope total.
export function resolveLinkMedia(link: { media: LinkMedia[]; carousels: SharedCarouselId[] }, items: MediaItem[]): LinkMedia[] {
  const out: LinkMedia[] = []
  const seen = new Set<string>()
  const add = (m: LinkMedia) => {
    if (out.length >= MAX_LINK_TOTAL || seen.has(m.url)) return
    seen.add(m.url)
    out.push(m)
  }
  link.media.forEach(add)
  for (const def of SHARED_CAROUSELS) {
    if (link.carousels.includes(def.id)) carouselMedia(def.id, items).forEach(add)
  }
  return out
}
