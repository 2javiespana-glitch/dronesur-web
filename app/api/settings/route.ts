import { NextResponse } from 'next/server'
import { readJSON, writeJSON, isAdmin, adminPasswordConfigured } from '@/lib/kv'

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
}

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET() {
  try {
    const saved = await readJSON<Partial<SiteSettings>>(KEY, {})
    // Fusionamos con los valores por defecto para que, si en el futuro se añade una
    // sección nueva, aparezca activada aunque todavía no se haya guardado nada para ella.
    return NextResponse.json(
      { ...DEFAULT_SETTINGS, ...saved },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

export async function POST(req: Request) {
  if (!adminPasswordConfigured()) {
    return fail('Falta configurar ADMIN_PASSWORD en Vercel.', 500)
  }
  if (!isAdmin(req)) return fail('Contraseña incorrecta', 401)

  let body: { action?: string; settings?: Partial<SiteSettings> }
  try {
    body = await req.json()
  } catch {
    return fail('Petición no válida', 400)
  }

  if (body.action !== 'set' || !body.settings) return fail('Acción no válida', 400)

  try {
    const current = await readJSON<Partial<SiteSettings>>(KEY, {})
    const updated = { ...DEFAULT_SETTINGS, ...current, ...body.settings }
    await writeJSON(KEY, updated)
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof Error && e.message === 'DB_NOT_CONFIGURED') {
      return fail('Falta conectar la base de datos (Upstash) en Vercel.', 500)
    }
    return fail('Error en el servidor al guardar los datos.', 500)
  }
}
