import type { Lang } from '@/lib/content'

// La web existe en dos idiomas, cada uno con su propia dirección:
//   español:  /                  /servicios/<categoría>
//   inglés:   /en                /en/services/<categoría>
// Las páginas legales, y las de ciudad, solo existen en español.

// Convierte una dirección en español a su equivalente en inglés (si no tiene, la deja igual).
export function toEnglishPath(path: string): string {
  if (path === '/') return '/en'
  if (path.startsWith('/#')) return `/en${path.slice(1)}` // /#servicios -> /en#servicios
  const service = path.match(/^\/servicios\/([^/?#]+)$/)
  if (service) return `/en/services/${service[1]}`
  return path
}

// Lo contrario: de la dirección en inglés a la española.
export function toSpanishPath(path: string): string {
  if (path === '/en') return '/'
  if (path.startsWith('/en#')) return `/${path.slice(3)}`
  const service = path.match(/^\/en\/services\/([^/?#]+)$/)
  if (service) return `/servicios/${service[1]}`
  return path
}

// Dirección equivalente de la página actual en el otro idioma.
// Devuelve null si esa página no tiene versión en el otro idioma (entonces solo cambia el texto).
export function alternatePath(pathname: string, target: Lang): string | null {
  if (target === 'en') {
    if (pathname === '/' || /^\/servicios\/[^/]+$/.test(pathname)) return toEnglishPath(pathname)
    if (pathname.startsWith('/dron/')) return '/en' // las páginas de ciudad solo existen en español
    return null
  }
  if (pathname === '/en' || /^\/en\/services\/[^/]+$/.test(pathname)) return toSpanishPath(pathname)
  return null
}
