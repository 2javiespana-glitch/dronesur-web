import { NextResponse } from 'next/server'
import { readJSON, updateJSON } from '@/lib/kv'
import { fail, serverError, requireAdmin } from '@/lib/api'
import { DEFAULT_QUOTE_DISCOUNT, normalizeQuoteDiscount, type QuoteDiscount } from '@/lib/quotes'

// Guarda qué secciones de la web están visibles u ocultas (lo que se controla desde
// el panel de admin, apartado "Qué se ve en la web").
//
// - GET  -> devuelve la configuración actual (pública, la usa la página principal)
// - POST -> { action: 'set', settings: {...} }  guarda los cambios (solo admin)

export const dynamic = 'force-dynamic'

const KEY = 'dronesur:settings'

export type PromoOverride = {
  badgeEs: string
  titleEs: string
  textEs: string
  ctaEs: string
  badgeEn: string
  titleEn: string
  textEn: string
  ctaEn: string
  finePrintEs: string // letra pequeña bajo el descuento (banner y formulario). En blanco = no se muestra
  finePrintEn: string
}

export type SiteSettings = {
  promo: boolean
  coverage: boolean
  guarantee: boolean
  reviews: boolean
  legal: boolean
  about: boolean
  pilot: boolean
  promoOverride: PromoOverride
  quoteDiscount: QuoteDiscount // casilla de descuento del formulario de presupuesto
}

const EMPTY_PROMO_OVERRIDE: PromoOverride = {
  badgeEs: '',
  titleEs: '',
  textEs: '',
  ctaEs: '',
  badgeEn: '',
  titleEn: '',
  textEn: '',
  ctaEn: '',
  finePrintEs: '',
  finePrintEn: '',
}

const DEFAULT_SETTINGS: SiteSettings = {
  promo: true,
  coverage: true,
  guarantee: true,
  reviews: true,
  legal: true,
  about: true,
  pilot: true,
  promoOverride: EMPTY_PROMO_OVERRIDE,
  quoteDiscount: DEFAULT_QUOTE_DISCOUNT,
}

const BOOLEAN_KEYS = ['promo', 'coverage', 'guarantee', 'reviews', 'legal', 'about', 'pilot'] as const

// Solo se guardan los ajustes conocidos (y con el tipo correcto). Así nadie puede colar
// campos raros en la base de datos aunque envíe una petición a mano.
function sanitizeSettings(input: unknown): Partial<SiteSettings> {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const out: Partial<SiteSettings> = {}
  for (const key of BOOLEAN_KEYS) {
    if (typeof src[key] === 'boolean') out[key] = src[key] as boolean
  }
  if (src.promoOverride && typeof src.promoOverride === 'object') {
    const po = src.promoOverride as Record<string, unknown>
    const clean = { ...EMPTY_PROMO_OVERRIDE }
    for (const field of Object.keys(EMPTY_PROMO_OVERRIDE) as (keyof PromoOverride)[]) {
      if (typeof po[field] === 'string') clean[field] = (po[field] as string).slice(0, 400)
    }
    out.promoOverride = clean
  }
  if (src.quoteDiscount && typeof src.quoteDiscount === 'object') {
    out.quoteDiscount = normalizeQuoteDiscount(src.quoteDiscount)
  }
  return out
}

export async function GET() {
  try {
    const saved = await readJSON<Partial<SiteSettings>>(KEY, {})
    // Fusionamos con los valores por defecto para que, si en el futuro se añade una
    // sección nueva, aparezca activada aunque todavía no se haya guardado nada para ella.
    return NextResponse.json(
      { ...DEFAULT_SETTINGS, ...saved, quoteDiscount: normalizeQuoteDiscount(saved.quoteDiscount) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  let body: { action?: string; settings?: unknown }
  try {
    body = await req.json()
  } catch {
    return fail('Petición no válida', 400)
  }

  if (body.action !== 'set' || !body.settings) return fail('Acción no válida', 400)

  const clean = sanitizeSettings(body.settings)

  try {
    const updated = await updateJSON<Partial<SiteSettings>>(KEY, {}, (current) => ({
      ...DEFAULT_SETTINGS,
      ...current,
      ...clean,
    }))
    return NextResponse.json(updated)
  } catch (e) {
    return serverError(e)
  }
}
