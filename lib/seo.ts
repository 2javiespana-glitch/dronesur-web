import { LEGAL } from '@/lib/legal'
import { SITE } from '@/lib/content'

// Ayudas para el posicionamiento en Google (SEO).

// Dirección de la web, sin barra final. Sale de lib/legal.ts (campo "web").
export const SITE_URL = `https://${LEGAL.web}`

// Convierte un objeto en el texto JSON que va dentro de <script type="application/ld+json">.
// Se escapa "<" para que nada pueda cerrar la etiqueta por error.
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

// Los "datos estructurados": una ficha escondida en la página que le cuenta a Google, en su idioma,
// qué es Dronesur, cómo contactar y dónde trabaja. No se ve en la web.
// No se incluye la dirección postal a propósito: das servicio yendo al cliente.
export function businessJsonLd(options?: { url?: string; areaServed?: string[]; description?: string }) {
  const areas = options?.areaServed ?? SITE.coverage
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${SITE_URL}/#negocio`,
    name: SITE.name,
    url: options?.url ?? SITE_URL,
    // Para Google se usa la versión grande; la de la cabecera (logo-dronesur.png) está reducida para cargar rápido.
    logo: `${SITE_URL}/logo-dronesur-large.png`,
    image: `${SITE_URL}/logo-dronesur-large.png`,
    description:
      options?.description ??
      'Servicios profesionales de fotografía y vídeo aéreo con drones: inmobiliaria, eventos, fotogrametría y seguimiento de obra.',
    telephone: LEGAL.telefono.replace(/\s+/g, ''),
    email: LEGAL.email,
    sameAs: [SITE.instagramUrl],
    areaServed: areas.map((name) => ({ '@type': 'City', name })),
    knowsAbout: ['fotografía aérea', 'vídeo aéreo con dron', 'fotogrametría', 'modelado 3D'],
  }
}
