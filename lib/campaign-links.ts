import type { Localized } from '@/lib/content'

// Enlaces cortos para carteles, tarjetas, QR...: dronesur.es/cartel1
// Cada uno puede (a) llevar directamente a la web principal o (b) enseñar antes una página de aviso con
// el texto de la oferta y un botón a la web. Se crean y editan desde el admin («Carteles y enlaces»).
// Este archivo lo comparten el servidor (la página y la API) y el panel del admin.

export const LINKS_KEY = 'dronesur:links'
export const MAX_LINKS = 60
export const MAX_LINK_MEDIA = 8 // fotos y vídeos del carrusel de la página de aviso

export const LINK_LIMITS = { name: 60, target: 200, title: 100, text: 1500, button: 40 }

export type LinkMode = 'redirect' | 'landing'

// Una foto o un vídeo del carrusel de la página de aviso (suben a Cloudinary desde el admin).
export type LinkMedia = { url: string; type: 'image' | 'video' }

export type CampaignLink = {
  slug: string // lo que va tras dronesur.es/ (también es el nombre con el que se cuentan las visitas: ?ref=slug)
  name: string // nombre interno, solo para ti en el admin
  mode: LinkMode
  target: string // a dónde se va (por defecto la portada). Siempre una dirección interna que empieza por /
  active: boolean
  title: Localized // solo en modo «página de aviso»
  text: Localized
  button: Localized
  media: LinkMedia[] // carrusel opcional, solo en modo «página de aviso»
  createdAt: number
}

// Direcciones que ya existen en la web (o las usa el sistema): un enlace no puede llamarse así.
// Las que existen de verdad siempre ganan igualmente, pero así no se crea uno que nunca funcionaría.
// Si algún día añades una página nueva en la raíz de la web, añádela también aquí.
export const RESERVED_SLUGS = [
  'admin', 'api', 'en', 'dron', 'servicios', 'aviso-legal', 'politica-de-privacidad', 'politica-de-cookies',
  'sitemap', 'robots', 'icon', 'apple-icon', 'favicon', 'opengraph-image', 'twitter-image', 'manifest',
  'static', 'public', 'assets', 'login', 'inicio', 'home',
]

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/ // 2 a 30 caracteres: letras minúsculas, números y guiones

// Convierte lo que escribas («Cartel Bares 1») en una dirección válida («cartel-bares-1»).
export function slugify(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '')
}

export function validateSlug(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return 'La dirección debe tener de 2 a 30 caracteres: letras sin tilde, números y guiones.'
  if (RESERVED_SLUGS.includes(slug)) return `«${slug}» ya lo usa la web. Elige otro nombre.`
  return null
}

// Solo direcciones internas: empiezan por una sola «/», sin espacios ni «\», y nunca hacia /api ni /admin.
export function isValidTarget(target: string): boolean {
  if (!target.startsWith('/') || target.startsWith('//')) return false
  if (target.length > LINK_LIMITS.target || /[\s\\\u0000-\u001f]/.test(target)) return false
  if (/^\/(api|admin)(\/|$|\?|#)/.test(target)) return false
  return true
}

// Añade «?ref=slug» (o «&ref=») a una dirección interna, respetando un posible «#ancla».
// Así la web principal apunta a qué cartel ha traído la visita (ver components/visit-tracker.tsx).
export function withRef(target: string, slug: string | null): string {
  if (!slug) return target
  const hash = target.indexOf('#')
  const base = hash >= 0 ? target.slice(0, hash) : target
  const anchor = hash >= 0 ? target.slice(hash) : ''
  return `${base}${base.includes('?') ? '&' : '?'}ref=${encodeURIComponent(slug)}${anchor}`
}

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function loc(value: unknown, max: number): Localized {
  const o = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  return { es: str(o.es, max), en: str(o.en, max) }
}

// Limpia la lista del carrusel: solo direcciones https, tipo foto o vídeo, sin repetir y con un máximo.
export function normalizeMedia(raw: unknown): LinkMedia[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: LinkMedia[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const url = str(r.url, 600)
    if (!url.startsWith('https://') || seen.has(url)) continue
    seen.add(url)
    out.push({ url, type: r.type === 'video' ? 'video' : 'image' })
    if (out.length >= MAX_LINK_MEDIA) break
  }
  return out
}

// Limpia un enlace que llega de la base de datos. Devuelve null si no vale (por ejemplo, dirección inválida).
export function normalizeLink(raw: unknown): CampaignLink | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const slug = str(r.slug, 30)
  if (validateSlug(slug)) return null
  const target = str(r.target, LINK_LIMITS.target)
  return {
    slug,
    name: str(r.name, LINK_LIMITS.name) || slug,
    mode: r.mode === 'landing' ? 'landing' : 'redirect',
    target: target && isValidTarget(target) ? target : '/',
    active: r.active !== false,
    title: loc(r.title, LINK_LIMITS.title),
    text: loc(r.text, LINK_LIMITS.text),
    button: loc(r.button, LINK_LIMITS.button),
    media: normalizeMedia(r.media),
    createdAt: typeof r.createdAt === 'number' && Number.isFinite(r.createdAt) ? r.createdAt : 0,
  }
}

export function normalizeLinks(raw: unknown): CampaignLink[] {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeLink).filter((l): l is CampaignLink => l !== null)
}

// ---------- Contadores ----------
// Cada vez que alguien abre un enlace se suma 1 al contador del día. No se guarda ninguna IP ni dato de la
// persona: solo «hoy, el enlace cartel1, una visita más». Se conservan ~13 meses.
export const SCANS_KEY = (day: string) => `dronesur:links:scans:${day}`
export const SCANS_TTL = 400 * 24 * 60 * 60
// Las visitas que ya llegan a la web principal con «?ref=» las cuenta app/api/visits/route.ts (solo quien
// acepta las estadísticas). Es el mismo nombre de clave que usa esa ruta.
export const REF_VISITS_KEY = (day: string) => `dronesur:visits:ref:${day}`

// Fecha en Madrid, formato AAAA-MM-DD. offset = días hacia atrás.
export function madridDay(offset = 0): string {
  const d = new Date(Date.now() - offset * 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(d)
}
