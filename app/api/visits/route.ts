import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { redis, clientHash } from '@/lib/kv'
import { fail, serverError, requireAdmin } from '@/lib/api'

// Recuento de visitas por provincia, sin formulario.
// - POST  cualquier visitante que haya aceptado las cookies de estadísticas (lo llama components/visit-tracker.tsx)
// - GET   ?days=30  solo admin: totales por provincia + últimas visitas
//
// Qué se guarda (nunca la IP):
//   · un contador por día y provincia (se conserva ~13 meses, sin ningún dato individual)
//   · un registro por visita: hora, provincia, ciudad aproximada, tipo de dispositivo, web de
//     procedencia y página de entrada (se borra solo a los 30 días)
//   · una huella cifrada de la conexión durante 30 minutos, solo para no contar dos veces la misma visita

export const dynamic = 'force-dynamic'

const DAY_KEY = (d: string) => `dronesur:visits:day:${d}`
const LIST_KEY = (d: string) => `dronesur:visits:list:${d}`
const REF_KEY = (d: string) => `dronesur:visits:ref:${d}` // contador por día y por «ref» (cartel, tarjeta, QR...)
const SEEN_KEY = (h: string) => `dronesur:visits:seen:${h}`
const COUNTER_TTL = 400 * 24 * 60 * 60 // ~13 meses
const LIST_TTL = 30 * 24 * 60 * 60 // 30 días
const SEEN_TTL = 30 * 60 // 30 minutos
const MAX_LIST_PER_DAY = 200
const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|curl|wget/i

type Visit = { t: number; province: string; city: string; device: string; path: string; from: string; ref?: string }

// Los dos primeros dígitos del código postal español son la provincia.
const PROVINCES: Record<string, string> = {
  '01': 'Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería', '05': 'Ávila',
  '06': 'Badajoz', '07': 'Illes Balears', '08': 'Barcelona', '09': 'Burgos', '10': 'Cáceres',
  '11': 'Cádiz', '12': 'Castellón', '13': 'Ciudad Real', '14': 'Córdoba', '15': 'A Coruña',
  '16': 'Cuenca', '17': 'Girona', '18': 'Granada', '19': 'Guadalajara', '20': 'Gipuzkoa',
  '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León', '25': 'Lleida',
  '26': 'La Rioja', '27': 'Lugo', '28': 'Madrid', '29': 'Málaga', '30': 'Murcia',
  '31': 'Navarra', '32': 'Ourense', '33': 'Asturias', '34': 'Palencia', '35': 'Las Palmas',
  '36': 'Pontevedra', '37': 'Salamanca', '38': 'Santa Cruz de Tenerife', '39': 'Cantabria', '40': 'Segovia',
  '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona', '44': 'Teruel', '45': 'Toledo',
  '46': 'Valencia', '47': 'Valladolid', '48': 'Bizkaia', '49': 'Zamora', '50': 'Zaragoza',
  '51': 'Ceuta', '52': 'Melilla',
}

// Vercel da como «región» el primer nivel (en España, la comunidad autónoma). Se usa solo si falta el código postal.
const COMMUNITIES: Record<string, string> = {
  AN: 'Andalucía', AR: 'Aragón', AS: 'Asturias', CN: 'Canarias', CB: 'Cantabria',
  CM: 'Castilla-La Mancha', CL: 'Castilla y León', CT: 'Cataluña', EX: 'Extremadura', GA: 'Galicia',
  IB: 'Illes Balears', RI: 'La Rioja', MD: 'Madrid', MC: 'Murcia', NC: 'Navarra',
  PV: 'País Vasco', VC: 'C. Valenciana', CE: 'Ceuta', ML: 'Melilla',
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

// Fecha en Madrid, formato AAAA-MM-DD. offset = días hacia atrás.
function madridDay(offset = 0): string {
  const d = new Date(Date.now() - offset * 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(d)
}

function whereFrom(h: Headers): { province: string; city: string } {
  const country = (h.get('x-vercel-ip-country') || '').toUpperCase()
  const region = (h.get('x-vercel-ip-country-region') || '').toUpperCase()
  const postal = h.get('x-vercel-ip-postal-code') || ''
  let city = h.get('x-vercel-ip-city') || ''
  try {
    city = decodeURIComponent(city)
  } catch {
    // Se deja tal cual.
  }

  let province = 'Desconocida'
  if (country === 'ES') {
    const fromPostal = /^\d{5}$/.test(postal) ? PROVINCES[postal.slice(0, 2)] : undefined
    const community = COMMUNITIES[region]
    province = fromPostal || (community ? `${community} (provincia sin determinar)` : 'España (sin determinar)')
  } else if (country) {
    province = `Extranjero (${country})`
  }
  return { province, city: city.slice(0, 60) }
}

export async function POST(req: Request) {
  const ua = req.headers.get('user-agent') || ''
  if (!ua || BOT_RE.test(ua)) return NextResponse.json({ ok: true, counted: false })

  let body: { path?: unknown; from?: unknown; ref?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    // Sin cuerpo también vale.
  }
  const path = text(body.path, 80)
  const from = text(body.from, 60)
  // «ref»: solo letras minúsculas, números, guion y guion bajo (nunca texto libre).
  const ref = text(body.ref, 30).toLowerCase().replace(/[^a-z0-9_-]/g, '')

  try {
    // La misma conexión y navegador cuentan una sola vez cada 30 minutos.
    const who = createHash('sha256').update(`${clientHash(req)}|${ua}`).digest('hex').slice(0, 32)
    const first = await redis(['SET', SEEN_KEY(who), '1', 'EX', String(SEEN_TTL), 'NX'])
    if (first !== 'OK') return NextResponse.json({ ok: true, counted: false })

    const { province, city } = whereFrom(req.headers)
    const day = madridDay()
    const visit: Visit = {
      t: Date.now(),
      province,
      city,
      device: /mobile|android|iphone/i.test(ua) ? 'móvil' : 'ordenador',
      path,
      from,
      ...(ref ? { ref } : {}),
    }

    await redis(['HINCRBY', DAY_KEY(day), province, '1'])
    await redis(['EXPIRE', DAY_KEY(day), String(COUNTER_TTL)])
    if (ref) {
      await redis(['HINCRBY', REF_KEY(day), ref, '1'])
      await redis(['EXPIRE', REF_KEY(day), String(COUNTER_TTL)])
    }
    await redis(['LPUSH', LIST_KEY(day), JSON.stringify(visit)])
    await redis(['LTRIM', LIST_KEY(day), '0', String(MAX_LIST_PER_DAY - 1)])
    await redis(['EXPIRE', LIST_KEY(day), String(LIST_TTL)])
    return NextResponse.json({ ok: true, counted: true })
  } catch (e) {
    return serverError(e)
  }
}

export async function GET(req: Request) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const url = new URL(req.url)
  const days = Math.min(Math.max(Math.round(Number(url.searchParams.get('days'))) || 30, 1), 90)

  try {
    const dates = Array.from({ length: days }, (_, i) => madridDay(i))
    const [hashes, refHashes] = await Promise.all([
      Promise.all(dates.map((d) => redis(['HGETALL', DAY_KEY(d)]))),
      Promise.all(dates.map((d) => redis(['HGETALL', REF_KEY(d)]))),
    ])

    // Visitas por «ref» (carteles, tarjetas, QR...) sumadas en todo el periodo.
    const refTotals: Record<string, number> = {}
    for (const flat of refHashes as unknown[]) {
      if (!Array.isArray(flat)) continue
      for (let k = 0; k + 1 < flat.length; k += 2) {
        const name = String(flat[k])
        refTotals[name] = (refTotals[name] || 0) + (Number(flat[k + 1]) || 0)
      }
    }
    const refs = Object.entries(refTotals)
      .map(([ref, visits]) => ({ ref, visits }))
      .sort((a, b) => b.visits - a.visits)

    const totals: Record<string, number> = {}
    const byDay = dates.map((date, i) => {
      const flat: unknown = hashes[i]
      let total = 0
      if (Array.isArray(flat)) {
        for (let k = 0; k + 1 < flat.length; k += 2) {
          const province = String(flat[k])
          const n = Number(flat[k + 1]) || 0
          totals[province] = (totals[province] || 0) + n
          total += n
        }
      }
      return { date, total }
    })

    // Últimas visitas: se miran los 3 últimos días, que es donde están las más recientes.
    const lists = await Promise.all(dates.slice(0, 3).map((d) => redis(['LRANGE', LIST_KEY(d), '0', '99'])))
    const recent: Visit[] = lists
      .flatMap((l: unknown) => (Array.isArray(l) ? l : []))
      .map((raw: unknown) => {
        try {
          return JSON.parse(String(raw)) as Visit
        } catch {
          return null
        }
      })
      .filter((v): v is Visit => v !== null)
      .sort((a, b) => b.t - a.t)
      .slice(0, 100)

    const list = Object.entries(totals)
      .map(([province, visits]) => ({ province, visits }))
      .sort((a, b) => b.visits - a.visits)

    return NextResponse.json(
      { total: list.reduce((s, x) => s + x.visits, 0), totals: list, refs, byDay, recent },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return serverError(e)
  }
}
