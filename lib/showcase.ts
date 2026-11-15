// La sección «oportunidad» (debajo del banner de descuento): un texto, un botón y, si quieres,
// un pequeño carrusel de fotos o vídeos con ideas de para qué aprovechar la oferta.
// Todo se edita desde el admin (apartado «Sección de oportunidad»). Este archivo reúne lo que
// comparten la web, el admin y las rutas /api para que los tres hablen igual.

import type { Localized } from '@/lib/content'

// Categoría interna donde se guardan las fotos y vídeos del carrusel de esta sección
// (igual que 'hero' es la del carrusel de inicio). No es una categoría de servicios.
export const SHOWCASE_CATEGORY = 'showcase'

// Tope de fotos/vídeos en el carrusel: es un carrusel pequeño y así no se dispara el gasto de Cloudinary.
export const SHOWCASE_MAX_ITEMS = 12

// Ancho (en píxeles) del vídeo que se pide a Cloudinary para este carrusel. Lo usan la web y la preparación
// de vídeos al subirlos (lib/video-warmup.ts), para que sea EXACTAMENTE la misma copia ya preparada.
export const SHOWCASE_VIDEO_WIDTH = 960

export type ShowcaseText = {
  badgeEs: string
  titleEs: string
  textEs: string
  ctaEs: string
  badgeEn: string
  titleEn: string
  textEn: string
  ctaEn: string
}

export const EMPTY_SHOWCASE_TEXT: ShowcaseText = {
  badgeEs: '',
  titleEs: '',
  textEs: '',
  ctaEs: '',
  badgeEn: '',
  titleEn: '',
  textEn: '',
  ctaEn: '',
}

// Máximo de caracteres de cada campo (insignia, título, texto, botón y pie de cada foto).
export const SHOWCASE_LIMITS = { badge: 40, title: 120, text: 600, cta: 60, caption: 80 } as const

export const SHOWCASE_TEXT_KEYS = Object.keys(EMPTY_SHOWCASE_TEXT) as (keyof ShowcaseText)[]

function limitFor(key: keyof ShowcaseText): number {
  if (key.startsWith('badge')) return SHOWCASE_LIMITS.badge
  if (key.startsWith('title')) return SHOWCASE_LIMITS.title
  if (key.startsWith('text')) return SHOWCASE_LIMITS.text
  return SHOWCASE_LIMITS.cta
}

// Limpia lo que llegue (de la base de datos o del admin): solo textos, recortados y sin campos raros.
export function normalizeShowcaseText(raw: unknown): ShowcaseText {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out = { ...EMPTY_SHOWCASE_TEXT }
  for (const key of SHOWCASE_TEXT_KEYS) {
    const value = src[key]
    if (typeof value === 'string') out[key] = value.trim().slice(0, limitFor(key))
  }
  return out
}

// Una foto o vídeo del carrusel, ya listo para la web.
export type ShowcaseSlide = {
  id: string
  kind: 'image' | 'video'
  url: string
  caption: Localized // pie de foto (puede estar vacío)
  alt: Localized // descripción para lectores de pantalla y Google
}

export type ShowcaseData = {
  carousel: boolean // false = la sección sale solo con texto y botón
  text: ShowcaseText
  slides: ShowcaseSlide[]
}
