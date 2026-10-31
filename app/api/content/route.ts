import { NextResponse } from 'next/server'
import { readJSON, updateJSON } from '@/lib/kv'
import { fail, serverError, requireAdmin } from '@/lib/api'
import { EMPTY_CONTENT, normalizeContent, type SiteContent } from '@/lib/site-content'

// Textos y fotos editables desde el admin: música del carrusel, "Sobre Dronesur" y "Sobre el piloto".
//
// - GET  -> devuelve el contenido guardado (público, lo usa la página principal)
// - POST -> { section: 'music' | 'about' | 'pilot', data: {...} }  guarda esa sección (solo admin)

export const dynamic = 'force-dynamic'

const KEY = 'dronesur:content'
const SECTIONS = ['music', 'about', 'pilot'] as const
type Section = (typeof SECTIONS)[number]

export async function GET() {
  try {
    const stored = await readJSON<unknown>(KEY, null)
    return NextResponse.json(normalizeContent(stored), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    // Si la base de datos aún no está conectada, la web no se rompe: se usan los textos de siempre.
    return NextResponse.json(EMPTY_CONTENT)
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  let body: { section?: string; data?: unknown }
  try {
    body = await req.json()
  } catch {
    return fail('Petición no válida', 400)
  }

  const section = SECTIONS.find((s) => s === body.section) as Section | undefined
  if (!section) return fail('Sección no válida', 400)

  // Se limpia lo recibido y solo se sustituye esa sección; las demás se quedan como estaban.
  const incoming = normalizeContent({ [section]: body.data })[section]

  try {
    const updated = await updateJSON<SiteContent>(KEY, EMPTY_CONTENT, (current) => ({
      ...normalizeContent(current),
      [section]: incoming,
    }))
    return NextResponse.json(updated)
  } catch (e) {
    return serverError(e)
  }
}
