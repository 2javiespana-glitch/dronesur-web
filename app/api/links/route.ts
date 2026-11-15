import { NextResponse } from 'next/server'
import { readJSON, redis, updateJSON } from '@/lib/kv'
import { fail, requireAdmin, serverError } from '@/lib/api'
import {
  LINKS_KEY,
  LINK_LIMITS,
  MAX_LINKS,
  REF_VISITS_KEY,
  SCANS_KEY,
  isValidTarget,
  madridDay,
  normalizeLinks,
  validateSlug,
  type CampaignLink,
} from '@/lib/campaign-links'

// Enlaces de carteles (dronesur.es/cartel1...). Solo para el admin.
// - GET   ?days=30  lista de enlaces + cuántas veces se han abierto y cuántas visitas han llegado a la web
// - POST  { action: 'save', isNew, link }   crea o edita un enlace
//         { action: 'delete', slug }        lo borra
// Quien abre el enlace no pasa por aquí: lo atiende app/[slug]/page.tsx.

export const dynamic = 'force-dynamic'

function sumHashes(results: unknown[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const flat of results) {
    if (!Array.isArray(flat)) continue
    for (let k = 0; k + 1 < flat.length; k += 2) {
      const name = String(flat[k])
      totals[name] = (totals[name] || 0) + (Number(flat[k + 1]) || 0)
    }
  }
  return totals
}

export async function GET(req: Request) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const days = Math.min(Math.max(Math.round(Number(new URL(req.url).searchParams.get('days'))) || 30, 1), 90)
  try {
    const links = normalizeLinks(await readJSON<unknown>(LINKS_KEY, []))
    const dates = Array.from({ length: days }, (_, i) => madridDay(i))
    const [scanRows, refRows] = await Promise.all([
      Promise.all(dates.map((d) => redis(['HGETALL', SCANS_KEY(d)]))),
      Promise.all(dates.map((d) => redis(['HGETALL', REF_VISITS_KEY(d)]))),
    ])
    const scans = sumHashes(scanRows)
    const visits = sumHashes(refRows)

    return NextResponse.json(
      {
        days,
        links: links
          .map((l) => ({ ...l, scans: scans[l.slug] || 0, visits: visits[l.slug] || 0 }))
          .sort((a, b) => b.createdAt - a.createdAt),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return serverError(e)
  }
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function loc(value: unknown, max: number) {
  const o = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  return { es: text(o.es, max), en: text(o.en, max) }
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  let body: { action?: unknown; isNew?: unknown; link?: unknown; slug?: unknown }
  try {
    body = await req.json()
  } catch {
    return fail('Petición no válida.', 400)
  }

  try {
    if (body.action === 'delete') {
      const slug = text(body.slug, 30)
      if (!slug) return fail('Falta la dirección del enlace.', 400)
      await updateJSON<unknown>(LINKS_KEY, [], (current) => normalizeLinks(current).filter((l) => l.slug !== slug))
      return NextResponse.json({ ok: true })
    }

    if (body.action !== 'save') return fail('Acción no válida.', 400)

    const raw = (body.link && typeof body.link === 'object' ? body.link : {}) as Record<string, unknown>
    const slug = text(raw.slug, 30)
    const slugProblem = validateSlug(slug)
    if (slugProblem) return fail(slugProblem, 400)

    const mode = raw.mode === 'landing' ? 'landing' : 'redirect'
    const target = text(raw.target, LINK_LIMITS.target) || '/'
    if (!isValidTarget(target)) {
      return fail('El destino debe ser una dirección de esta web que empiece por «/», por ejemplo / o /servicios/eventos.', 400)
    }
    const title = loc(raw.title, LINK_LIMITS.title)
    if (mode === 'landing' && !title.es) return fail('En la página de aviso, escribe al menos el título en español.', 400)

    const isNew = body.isNew === true
    const candidate = {
      slug,
      name: text(raw.name, LINK_LIMITS.name) || slug,
      mode,
      target,
      active: raw.active !== false,
      title,
      text: loc(raw.text, LINK_LIMITS.text),
      button: loc(raw.button, LINK_LIMITS.button),
    } satisfies Omit<CampaignLink, 'createdAt'>

    await updateJSON<unknown>(LINKS_KEY, [], (current) => {
      const links = normalizeLinks(current)
      const index = links.findIndex((l) => l.slug === slug)
      if (isNew && index >= 0) throw new Error('LINK_EXISTS')
      if (!isNew && index < 0) throw new Error('LINK_MISSING')
      if (isNew && links.length >= MAX_LINKS) throw new Error('LINK_LIMIT')
      if (index >= 0) {
        links[index] = { ...candidate, createdAt: links[index].createdAt || Date.now() }
      } else {
        links.push({ ...candidate, createdAt: Date.now() })
      }
      return links
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'LINK_EXISTS') return fail('Ya existe un enlace con esa dirección. Elige otra.', 409)
      if (e.message === 'LINK_MISSING') return fail('Ese enlace ya no existe (puede que lo hayas borrado).', 404)
      if (e.message === 'LINK_LIMIT') return fail(`Has llegado al máximo de ${MAX_LINKS} enlaces.`, 400)
    }
    return serverError(e)
  }
}
