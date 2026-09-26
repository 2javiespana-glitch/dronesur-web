export type Lang = 'es' | 'en'
export type Localized = { es: string; en: string }

export interface VideoItem {
  id: string
  title: string
  url: string
  category?: string
  poster?: string
}

export const INITIAL_VIDEOS: VideoItem[] = [
  { id: '1', title: 'Vídeo Carrusel 1', url: '/videos/hero1.mp4', category: 'hero' },
  { id: '2', title: 'Vídeo Bodas 1', url: '/videos/bodas1.mp4', category: 'bodas' },
]

// ---------------------------------------------------------------------------
// Business constants – replace with the real values when available.
// ---------------------------------------------------------------------------
export const SITE = {
  name: 'Dronesur',
  instagram: 'dronesur',
  instagramUrl: 'https://instagram.com/dronesur',
  // WhatsApp number in international format WITHOUT "+" or spaces.
  whatsapp: '34644424448',
  email: 'info@dronesur.es',
  adminPassword: 'poyete_dronesur',
  coverage: ['Almería', 'Granada', 'Málaga', 'Jaén', 'Cádiz', 'Murcia'],
}

// ---------------------------------------------------------------------------
// Hero slides — drop your own videos into /public/hero and set `video`.
// Each slide already has a poster image as a fallback / while loading.
// ---------------------------------------------------------------------------
export type HeroSlide = {
  poster: string
  video?: string // e.g. '/hero/reel-1.mp4'
  captionEs: string
  captionEn: string
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    poster: '/hero/hero-coastline.png',
    video: undefined, // '/hero/coastline.mp4'
    captionEs: 'Costas del sur',
    captionEn: 'Southern coasts',
  },
  {
    poster: '/hero/hero-city.png',
    video: undefined, // '/hero/town.mp4'
    captionEs: 'Pueblos con encanto',
    captionEn: 'Charming towns',
  },
  {
    poster: '/hero/hero-mountains.png',
    video: undefined, // '/hero/mountains.mp4'
    captionEs: 'Paisajes de altura',
    captionEn: 'Mountain landscapes',
  },
]

// Background music for the hero carousel. Drop an .mp3 into /public/audio.
export const HERO_AUDIO = '/audio/cinematic-theme.mp3'

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export type Category = {
  slug: string
  image: string
  gallery: string[]
  price: Localized
  title: Localized
  short: Localized
  description: Localized
}

export const CATEGORIES: Category[] = [
  {
    slug: 'inmobiliaria',
    image: '/categories/inmobiliaria.png',
    gallery: [
      '/categories/inmobiliaria.png',
      '/hero/hero-coastline.png',
      '/hero/hero-city.png',
    ],
    price: { es: 'desde 30 €/hora', en: 'from €30/hour' },
    title: {
      es: 'Inmobiliaria, Hoteles & Terrenos',
      en: 'Real Estate, Hotels & Land',
    },
    short: {
      es: 'Muestra propiedades, hoteles y parcelas desde el cielo con imágenes que venden.',
      en: 'Showcase properties, hotels and plots from the sky with imagery that sells.',
    },
    description: {
      es: 'Vistas aéreas que revalorizan cualquier inmueble: villas, hoteles, complejos turísticos y terrenos. Destacamos ubicación, entorno y dimensiones reales con tomas cinematográficas en 4K listas para portales y redes.',
      en: 'Aerial views that add value to any property: villas, hotels, resorts and land. We highlight location, surroundings and real dimensions with cinematic 4K footage ready for listings and social media.',
    },
  },
  {
    slug: 'eventos',
    image: '/categories/bodas.png',
    gallery: [
      '/categories/bodas.png',
      '/hero/hero-mountains.png',
      '/categories/aerea.png',
    ],
    price: { es: 'desde 30 €/hora', en: 'from €30/hour' },
    title: {
      es: 'Bodas, Graduaciones & Eventos',
      en: 'Weddings, Graduations & Events',
    },
    short: {
      es: 'El recuerdo de tu gran día desde una perspectiva única e inolvidable.',
      en: 'The memory of your big day from a unique, unforgettable perspective.',
    },
    description: {
      es: 'Capturamos la emoción de bodas, graduaciones y celebraciones con planos aéreos espectaculares. Un recuerdo diferente que combina con la cobertura tradicional para contar tu historia completa.',
      en: 'We capture the emotion of weddings, graduations and celebrations with spectacular aerial shots. A different keepsake that pairs with traditional coverage to tell your full story.',
    },
  },
  {
    slug: 'fotogrametria',
    image: '/categories/fotogrametria.png',
    gallery: [
      '/categories/fotogrametria.png',
      '/categories/obra.png',
      '/hero/hero-mountains.png',
    ],
    price: { es: '45 €/proyecto', en: '€45/project' },
    title: {
      es: 'Fotogrametría & Modelado 3D',
      en: 'Photogrammetry & 3D Modeling',
    },
    short: {
      es: 'Modelado 3D, mediciones precisas y conteo de unidades. Entrega en 48 h.',
      en: '3D modeling, precise measurements and unit counting. Delivered in 48h.',
    },
    description: {
      es: 'Generamos modelos 3D, ortomosaicos y mediciones precisas del terreno y estructuras. Ideal para topografía, agricultura, inventario y conteo de unidades. Entregamos los proyectos en un máximo de 48 horas.',
      en: 'We generate 3D models, orthomosaics and precise measurements of terrain and structures. Ideal for surveying, agriculture, inventory and unit counting. Projects delivered within 48 hours.',
    },
  },
  {
    slug: 'obra',
    image: '/categories/obra.png',
    gallery: [
      '/categories/obra.png',
      '/categories/fotogrametria.png',
      '/hero/hero-city.png',
    ],
    price: { es: '20 €/sesión', en: '€20/session' },
    title: {
      es: 'Seguimiento Exterior de Obra',
      en: 'Exterior Construction Monitoring',
    },
    short: {
      es: 'Documenta el avance de tu obra sesión a sesión con precisión profesional.',
      en: 'Document your project progress session by session with professional precision.',
    },
    description: {
      es: 'Seguimiento periódico del avance de obra desde el aire. Documentación visual para promotores, constructoras y comunidades, con comparativas de progreso y material listo para informes.',
      en: 'Periodic aerial monitoring of construction progress. Visual documentation for developers, builders and communities, with progress comparisons and report-ready material.',
    },
  },
  {
    slug: 'aerea',
    image: '/categories/aerea.png',
    gallery: [
      '/categories/aerea.png',
      '/hero/hero-coastline.png',
      '/hero/hero-mountains.png',
    ],
    price: { es: 'Presupuesto a medida', en: 'Custom quote' },
    title: {
      es: 'Fotografía & Vídeo Aéreo General',
      en: 'General Aerial Photo & Video',
    },
    short: {
      es: 'Proyectos audiovisuales aéreos a medida para cualquier necesidad.',
      en: 'Custom aerial audiovisual projects for any need.',
    },
    description: {
      es: 'Cualquier proyecto que imagines desde el aire: turismo, publicidad, deporte, naturaleza o contenido para redes. Adaptamos equipo, estilo y edición a tu marca y objetivos.',
      en: 'Any project you can imagine from above: tourism, advertising, sport, nature or social content. We adapt gear, style and editing to your brand and goals.',
    },
  },
]

export function getCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)
}

// ---------------------------------------------------------------------------
// UI translations
// ---------------------------------------------------------------------------
type Dict = Record<string, Localized>

export const T: Dict = {
  'nav.home': { es: 'Inicio', en: 'Home' },
  'nav.services': { es: 'Servicios', en: 'Services' },
  'nav.promos': { es: 'Promociones', en: 'Offers' },
  'nav.legal': { es: 'Garantía Legal', en: 'Legal' },
  'nav.reviews': { es: 'Reseñas', en: 'Reviews' },
  'nav.about': { es: 'Sobre Nosotros', en: 'About' },
  'nav.contact': { es: 'Contacto', en: 'Contact' },

  'hero.title': {
    es: 'Elevamos la imagen de tu proyecto',
    en: 'We elevate the image of your project',
  },
  'hero.subtitle': {
    es: 'Perspectivas aéreas de alto impacto en el sur de España.',
    en: 'High-impact aerial perspectives across southern Spain.',
  },
  'hero.cta': { es: 'Pide tu presupuesto', en: 'Get your quote' },
  'hero.services': { es: 'Ver servicios', en: 'See services' },
  'hero.scroll': { es: 'Desliza', en: 'Scroll' },
  'hero.mute': { es: 'Activar sonido', en: 'Unmute' },
  'hero.unmute': { es: 'Silenciar', en: 'Mute' },
  'hero.prev': { es: 'Anterior', en: 'Previous' },
  'hero.next': { es: 'Siguiente', en: 'Next' },

  'promo.badge': { es: 'Nuevos clientes', en: 'New clients' },
  'promo.title': { es: '¡15% DTO DE BIENVENIDA!', en: '15% WELCOME DISCOUNT!' },
  'promo.text': {
    es: 'Consigue un 15% de descuento directo en tu primera contratación con Dronesur al pedir tu presupuesto por WhatsApp.',
    en: 'Get a 15% direct discount on your first booking with Dronesur when you request your quote via WhatsApp.',
  },
  'promo.cta': { es: 'Reclamar mi 15%', en: 'Claim my 15%' },

  'cat.title': { es: 'Nuestros Servicios', en: 'Our Services' },
  'cat.subtitle': {
    es: 'Soluciones aéreas profesionales para cada tipo de proyecto.',
    en: 'Professional aerial solutions for every kind of project.',
  },
  'cat.view': { es: 'Ver categoría', en: 'View category' },
  'cat.quote': { es: 'Pedir presupuesto', en: 'Request a quote' },
  'cat.back': { es: 'Volver a servicios', en: 'Back to services' },
  'cat.gallery': { es: 'Galería de trabajos', en: 'Work gallery' },

  'cover.title': { es: 'Cobertura y Servicios Incluidos', en: 'Coverage & Included Services' },
  'cover.geoTitle': { es: 'Dónde volamos', en: 'Where we fly' },
  'cover.geoText': {
    es: 'Damos servicio en toda la zona sur y sureste de España:',
    en: 'We operate across the south and southeast of Spain:',
  },
  'cover.includedTitle': { es: 'Incluido en el precio', en: 'Included in the price' },
  'cover.inc1': {
    es: 'Cobertura técnica y audiovisual con dron en 4K.',
    en: 'Technical and audiovisual drone coverage in 4K.',
  },
  'cover.inc2': {
    es: 'Edición de un vídeo corto optimizado para redes (Reels / TikTok / Instagram).',
    en: 'Editing of a short video optimized for social media (Reels / TikTok / Instagram).',
  },
  'cover.inc3': {
    es: 'Tramitación completa de licencias, permisos y coordinaciones para volar en España (normativa AESA/EASA).',
    en: 'Full processing of licenses, permits and coordination to fly in Spain (AESA/EASA regulations).',
  },
  'cover.inc4': {
    es: 'Entrega inmediata del material bruto en USB (incluido) y/o enlace digital sin pérdida de calidad (SwissTransfer / Telegram).',
    en: 'Immediate delivery of raw footage on USB (included) and/or lossless digital link (SwissTransfer / Telegram).',
  },
  'cover.inc5': {
    es: 'Entrega de proyectos 3D / fotogrametría en un máximo de 48 horas.',
    en: '3D / photogrammetry projects delivered within 48 hours.',
  },

  'guarantee.title': { es: 'Garantía de Satisfacción', en: 'Satisfaction Guarantee' },
  'guarantee.text': {
    es: 'No pagas por el servicio si no te gusta el resultado.',
    en: "You don't pay for the service if you don't like the result.",
  },

  'reviews.title': { es: 'Reseñas de Clientes', en: 'Client Reviews' },
  'reviews.subtitle': {
    es: 'La confianza de quienes ya han volado con nosotros.',
    en: 'The trust of those who have already flown with us.',
  },
  'reviews.admin': { es: 'Panel de administración', en: 'Admin panel' },

  'legal.title': { es: 'Seguridad y Garantía Legal', en: 'Safety & Legal Compliance' },
  'legal.text': {
    es: 'Operamos según la normativa aérea para un vuelo 100% legal y seguro. Todos nuestros vuelos están coordinados y autorizados según los requisitos de AESA y EASA con pilotos certificados.',
    en: 'We operate under aviation regulations for a 100% legal and safe flight. All our flights are coordinated and authorized according to AESA and EASA requirements with certified pilots.',
  },
  'legal.aesa': { es: 'Operador registrado AESA', en: 'AESA registered operator' },
  'legal.easa': { es: 'Normativa EASA', en: 'EASA compliant' },
  'legal.insured': { es: 'Trámites legales incluidos', en: 'Legal permits included' },
  'legal.deliveryTitle': { es: 'Entrega del material', en: 'Material delivery' },

  'about.title': { es: 'Sobre Dronesur', en: 'About Dronesur' },
  'about.p1': {
    es: 'Dronesur nace de la pasión por la imagen aérea y el detalle profesional. Somos un equipo especializado en captar el sur de España desde una perspectiva única, combinando tecnología de última generación con una mirada cinematográfica.',
    en: 'Dronesur was born from a passion for aerial imagery and professional detail. We are a team specialized in capturing southern Spain from a unique perspective, combining state-of-the-art technology with a cinematic eye.',
  },
  'about.p2': {
    es: 'Trabajamos con particulares, empresas e instituciones ofreciendo un servicio integral: desde la planificación y los permisos hasta la edición final. Nuestro objetivo es simple: que tu proyecto brille desde el aire.',
    en: 'We work with individuals, companies and institutions offering an all-in-one service: from planning and permits to final editing. Our goal is simple: to make your project shine from above.',
  },
  'about.stat1': { es: 'Provincias cubiertas', en: 'Provinces covered' },
  'about.stat2': { es: 'Calidad de grabación', en: 'Recording quality' },
  'about.stat3': { es: 'Entrega fotogrametría', en: 'Photogrammetry delivery' },

  'contact.title': { es: 'Contacto', en: 'Contact' },
  'contact.subtitle': {
    es: '¿Listo para elevar tu proyecto? Pide tu presupuesto sin compromiso.',
    en: 'Ready to elevate your project? Request a no-obligation quote.',
  },
  'contact.whatsapp': { es: 'Escríbenos por WhatsApp', en: 'Message us on WhatsApp' },
  'contact.instagram': { es: 'Síguenos en Instagram', en: 'Follow us on Instagram' },

  'footer.tagline': {
    es: 'Perspectivas aéreas de alto impacto en el sur de España.',
    en: 'High-impact aerial perspectives across southern Spain.',
  },
  'footer.rights': { es: 'Todos los derechos reservados.', en: 'All rights reserved.' },

  'cookies.text': {
    es: 'Usamos cookies propias y de terceros para mejorar tu experiencia y analizar el tráfico. Puedes aceptar o rechazar su uso.',
    en: 'We use our own and third-party cookies to improve your experience and analyze traffic. You can accept or reject their use.',
  },
  'cookies.accept': { es: 'Aceptar', en: 'Accept' },
  'cookies.reject': { es: 'Rechazar', en: 'Reject' },

  'wa.title': { es: 'Solicitar presupuesto', en: 'Request a quote' },
  'wa.intro': {
    es: 'Cuéntanos qué necesitas y te preparamos un presupuesto a medida.',
    en: 'Tell us what you need and we will prepare a custom quote.',
  },
  'wa.service': { es: 'Servicio de interés', en: 'Service of interest' },
  'wa.location': { es: 'Localidad / provincia', en: 'Town / province' },
  'wa.details': { es: 'Detalles del proyecto', en: 'Project details' },
  'wa.discount': {
    es: 'Aplicar mi 15% de descuento de bienvenida (nuevo cliente)',
    en: 'Apply my 15% welcome discount (new client)',
  },
  'wa.send': { es: 'Enviar por WhatsApp', en: 'Send via WhatsApp' },
  'wa.close': { es: 'Cerrar', en: 'Close' },
  'wa.selectPlaceholder': { es: 'Selecciona un servicio', en: 'Select a service' },

  'admin.title': { es: 'Panel de Reseñas', en: 'Reviews Panel' },
  'admin.login': { es: 'Acceso administrador', en: 'Admin access' },
  'admin.password': { es: 'Contraseña', en: 'Password' },
  'admin.enter': { es: 'Entrar', en: 'Enter' },
  'admin.wrong': { es: 'Contraseña incorrecta', en: 'Wrong password' },
  'admin.logout': { es: 'Salir', en: 'Log out' },
  'admin.add': { es: 'Añadir reseña', en: 'Add review' },
  'admin.name': { es: 'Nombre', en: 'Name' },
  'admin.role': { es: 'Cargo / ubicación', en: 'Role / location' },
  'admin.rating': { es: 'Valoración', en: 'Rating' },
  'admin.text': { es: 'Reseña', en: 'Review' },
  'admin.save': { es: 'Guardar', en: 'Save' },
  'admin.cancel': { es: 'Cancelar', en: 'Cancel' },
  'admin.edit': { es: 'Editar', en: 'Edit' },
  'admin.delete': { es: 'Borrar', en: 'Delete' },
  'admin.reset': { es: 'Restaurar ejemplos', en: 'Reset samples' },
  'admin.back': { es: 'Volver al inicio', en: 'Back to home' },
  'admin.empty': { es: 'No hay reseñas todavía.', en: 'No reviews yet.' },
}

export function translate(key: string, lang: Lang): string {
  const entry = T[key]
  if (!entry) return key
  return entry[lang]
}
