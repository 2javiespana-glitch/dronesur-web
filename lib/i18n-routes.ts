import type { Lang } from '@/lib/content'

// ---------- Las dos «caras» de la web ----------
// La web existe dos veces con los MISMOS datos (categorías, fotos, vídeos, reseñas...):
//   · la web principal:  /   /servicios/<categoría>   /en ...          → SIN la oferta de bienvenida
//   · la de la universidad: /ual   /ual/servicios/<categoría>   /ual/en ...  → CON la oferta
// Estas funciones separan el «/ual» del resto de la dirección y lo vuelven a poner.

export const UAL_PREFIX = '/ual'

// ¿La dirección de la página actual es de la cara /ual?
export function isUalPath(pathname: string | null | undefined): boolean {
  return !!pathname && (pathname === UAL_PREFIX || pathname.startsWith(`${UAL_PREFIX}/`))
}

// Separa el «/ual» de una dirección o enlace:  '/ual' → '/'   '/ual/en#x' → '/en#x'   '/ual#x' → '/#x'
export function splitUal(path: string): { ual: boolean; rest: string } {
  if (path === UAL_PREFIX) return { ual: true, rest: '/' }
  const next = path.charAt(UAL_PREFIX.length)
  if (path.startsWith(UAL_PREFIX) && (next === '/' || next === '#' || next === '?')) {
    const rest = path.slice(UAL_PREFIX.length)
    return { ual: true, rest: rest.startsWith('/') ? rest : `/${rest}` }
  }
  return { ual: false, rest: path }
}

// Pone «/ual» delante de una dirección de la web:  '/' → '/ual'   '/#servicios' → '/ual#servicios'
export function joinUal(rest: string): string {
  if (rest === '/') return UAL_PREFIX
  if (rest.startsWith('/#') || rest.startsWith('/?')) return `${UAL_PREFIX}${rest.slice(1)}`
  return `${UAL_PREFIX}${rest}`
}

// Las páginas que existen en las dos caras (portada y servicios, en español e inglés). Las demás (legales...)
// son únicas y no llevan «/ual».
export function belongsToSite(rest: string): boolean {
  return (
    rest === '/' ||
    rest.startsWith('/#') ||
    rest.startsWith('/servicios/') ||
    rest === '/en' ||
    rest.startsWith('/en/') ||
    rest.startsWith('/en#')
  )
}

function viaUal(path: string, fn: (p: string) => string): string {
  const { ual, rest } = splitUal(path)
  const out = fn(rest)
  return ual ? joinUal(out) : out
}

// La web existe en dos idiomas, cada uno con su propia dirección:
//   español:  /                  /servicios/<categoría>
//   inglés:   /en                /en/services/<categoría>
// Las páginas legales, y las de ciudad, solo existen en español.

// Convierte una dirección en español a su equivalente en inglés (si no tiene, la deja igual).
function toEnglishBase(path: string): string {
  if (path === '/') return '/en'
  if (path.startsWith('/#')) return `/en${path.slice(1)}` // /#servicios -> /en#servicios
  const service = path.match(/^\/servicios\/([^/?#]+)$/)
  if (service) return `/en/services/${service[1]}`
  return path
}

// Lo contrario: de la dirección en inglés a la española.
function toSpanishBase(path: string): string {
  if (path === '/en') return '/'
  if (path.startsWith('/en#')) return `/${path.slice(3)}`
  const service = path.match(/^\/en\/services\/([^/?#]+)$/)
  if (service) return `/servicios/${service[1]}`
  return path
}

// Dirección equivalente de la página actual en el otro idioma.
// Devuelve null si esa página no tiene versión en el otro idioma (entonces solo cambia el texto).
function alternateBase(pathname: string, target: Lang): string | null {
  if (target === 'en') {
    if (pathname === '/' || /^\/servicios\/[^/]+$/.test(pathname)) return toEnglishPath(pathname)
    if (pathname.startsWith('/dron/')) return '/en' // las páginas de ciudad solo existen en español
    return null
  }
  if (pathname === '/en' || /^\/en\/services\/[^/]+$/.test(pathname)) return toSpanishPath(pathname)
  return null
}

export function toEnglishPath(path: string): string {
  return viaUal(path, toEnglishBase)
}

export function toSpanishPath(path: string): string {
  return viaUal(path, toSpanishBase)
}

export function alternatePath(pathname: string, target: Lang): string | null {
  const { ual, rest } = splitUal(pathname)
  const out = alternateBase(rest, target)
  return out && ual ? joinUal(out) : out
}
