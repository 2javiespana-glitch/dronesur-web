import { NextResponse } from 'next/server'
import { readJSONPublic } from '@/lib/kv'

// Qué secciones de la web están visibles (las casillas de "Qué se ve en la web" del admin).
// Lo usa la cabecera para ocultar enlaces del menú. Solo devuelve sí/no de cada sección (nada
// privado) y la respuesta se guarda 1 minuto, así que no se consulta la base de datos en cada visita.
// (El admin sigue usando /api/settings, que está siempre al día.)

export const dynamic = 'force-dynamic'

const SECTIONS = ['promo', 'coverage', 'guarantee', 'reviews', 'legal', 'about', 'pilot'] as const

export async function GET() {
  let saved: Record<string, unknown> = {}
  try {
    saved = await readJSONPublic<Record<string, unknown>>('dronesur:settings', {})
  } catch {
    // Sin base de datos, todas las secciones visibles (lo normal).
  }

  const out: Record<string, boolean> = {}
  for (const key of SECTIONS) out[key] = typeof saved[key] === 'boolean' ? (saved[key] as boolean) : true

  return NextResponse.json(out, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  })
}
