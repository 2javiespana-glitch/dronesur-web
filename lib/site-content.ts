import type { Lang, Localized } from '@/lib/content'

// Textos y fotos que se editan desde el panel de admin (ver components/content-panel.tsx):
// - la música del carrusel
// - la sección "Sobre Dronesur"
// - la sección "Sobre el piloto"
// Todo lo que esté vacío ('') significa "usa lo de siempre" (o no muestres nada).

export type SiteContent = {
  music: { url: string }
  about: { image: string; p1: Localized; p2: Localized }
  pilot: { name: string; image: string; text: Localized }
}

export const EMPTY_CONTENT: SiteContent = {
  music: { url: '' },
  about: { image: '', p1: { es: '', en: '' }, p2: { es: '', en: '' } },
  pilot: { name: '', image: '', text: { es: '', en: '' } },
}

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

// Solo se admiten direcciones https:// (las de Cloudinary lo son).
function url(value: unknown): string {
  const s = str(value, 600)
  return s.startsWith('https://') ? s : ''
}

function loc(value: unknown, max: number): Localized {
  const o = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  return { es: str(o.es, max), en: str(o.en, max) }
}

// Limpia y completa lo que llegue (de la base de datos o del panel de admin):
// recorta longitudes, descarta enlaces raros y rellena lo que falte.
export function normalizeContent(raw: unknown): SiteContent {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const section = (key: string) =>
    (r[key] && typeof r[key] === 'object' ? r[key] : {}) as Record<string, unknown>
  const music = section('music')
  const about = section('about')
  const pilot = section('pilot')
  return {
    music: { url: url(music.url) },
    about: { image: url(about.image), p1: loc(about.p1, 1200), p2: loc(about.p2, 1200) },
    pilot: { name: str(pilot.name, 80), image: url(pilot.image), text: loc(pilot.text, 2000) },
  }
}

// Texto en el idioma del visitante; si falta, el español; si tampoco hay, cadena vacía.
export function localizedOr(custom: Localized, lang: Lang): string {
  return (custom[lang] || custom.es || '').trim()
}

// Pide a Cloudinary una versión más ligera de la foto (más rápida de cargar).
export function optimizeImage(imageUrl: string, width: number): string {
  if (!imageUrl.includes('res.cloudinary.com/') || !imageUrl.includes('/image/upload/')) return imageUrl
  if (/\/image\/upload\/[a-z]+_/.test(imageUrl)) return imageUrl
  return imageUrl.replace('/image/upload/', `/image/upload/c_limit,w_${width},q_auto,f_auto/`)
}
