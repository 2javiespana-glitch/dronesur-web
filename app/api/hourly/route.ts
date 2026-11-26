import { NextResponse } from 'next/server'
import { redis } from '@/lib/kv'
import { requireAdmin, serverError } from '@/lib/api'
import { madridDay } from '@/lib/campaign-links'
import { HOUR_REF_KEY, HOUR_SCAN_KEY, HOUR_WEB_KEY, buildHourly, hourOf } from '@/lib/hourly-stats'

// Visitas por día y hora (hora de Madrid). Solo para el admin.
// - GET ?kind=web&days=30                  visitas a la web
// - GET ?kind=links&days=30&slug=cartel1   aperturas del enlace + visitas a la web que trajo (sin slug: todos los enlaces)
// Lo dibuja components/hourly-stats.tsx. Qué se guarda y dónde: lib/hourly-stats.ts.

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const url = new URL(req.url)
  const kind = url.searchParams.get('kind') === 'links' ? 'links' : 'web'
  const days = Math.min(Math.max(Math.round(Number(url.searchParams.get('days'))) || 30, 1), 90)
  const slug = (url.searchParams.get('slug') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30)
  const dates = Array.from({ length: days }, (_, i) => madridDay(i))

  // Campo «cartel|HH»: se queda con el del cartel pedido (o con todos si no se pidió ninguno).
  const pickRef = (field: string): number | null => {
    const i = field.lastIndexOf('|')
    if (i < 0) return null
    if (slug && field.slice(0, i) !== slug) return null
    return hourOf(field.slice(i + 1))
  }

  try {
    const headers = { 'Cache-Control': 'no-store' }
    if (kind === 'web') {
      const flats = await Promise.all(dates.map((d) => redis(['HGETALL', HOUR_WEB_KEY(d)])))
      return NextResponse.json({ days, visits: buildHourly(dates, flats, hourOf) }, { headers })
    }
    const [scanFlats, refFlats] = await Promise.all([
      Promise.all(dates.map((d) => redis(['HGETALL', HOUR_SCAN_KEY(d)]))),
      Promise.all(dates.map((d) => redis(['HGETALL', HOUR_REF_KEY(d)]))),
    ])
    return NextResponse.json(
      { days, openings: buildHourly(dates, scanFlats, pickRef), visits: buildHourly(dates, refFlats, pickRef) },
      { headers },
    )
  } catch (e) {
    return serverError(e)
  }
}
