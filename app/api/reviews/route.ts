import { NextResponse } from 'next/server'
import { readJSON, updateJSON, redis, isAdmin, clientHash } from '@/lib/kv'
import { fail, serverError, requireAdmin } from '@/lib/api'
import { notifyTelegram } from '@/lib/telegram'

// Opiniones de clientes.
// - GET    -> devuelve las opiniones. El público solo ve las aprobadas; el admin
//             (con su contraseña) las ve todas, incluidas las pendientes.
// - POST   -> { action: 'submit', review }  cualquier visitante envía la suya: queda
//                                          PENDIENTE hasta que el admin la apruebe
//             { action: 'add', review }     el admin añade una opinión (ya aprobada)
//             { action: 'update', id, review } el admin edita una opinión
//             { action: 'approve', id, approved } el admin aprueba o retira una opinión
// - DELETE -> { id }  el admin borra una opinión

export const dynamic = 'force-dynamic'

const KEY = 'dronesur:reviews'
const MAX_NAME = 80
const MAX_TEXT = 600
const MAX_PUBLIC_PER_DAY = 3 // reseñas que puede enviar una misma persona (IP) cada 24 horas
const WINDOW_SECONDS = 24 * 60 * 60

export type Review = {
  id: string
  name: string
  role: string // profesión o empresa; puede ir vacío
  rating: number // 0 = sin estrellas (solo el admin), 1 a 5 = con puntuación
  text: string
  source: 'public' | 'admin'
  approved?: boolean // undefined = opiniones antiguas, se consideran aprobadas
  createdAt: number
}

async function readAll(): Promise<Review[]> {
  return readJSON<Review[]>(KEY, [])
}

// Cualquier cambio en la lista pasa por aquí, para que dos cambios simultáneos no se pisen.
function changeAll(mutate: (reviews: Review[]) => Review[]): Promise<Review[]> {
  return updateJSON<Review[]>(KEY, [], mutate)
}

// Fecha de la reseña (la elige el admin): 'YYYY-MM-DD'. Devuelve milisegundos o null si no es válida.
function parseReviewDate(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const ts = new Date(`${value}T12:00:00Z`).getTime()
  if (!Number.isFinite(ts)) return null
  if (ts > Date.now()) return null // no se permiten fechas futuras
  if (ts < new Date('2020-01-01T00:00:00Z').getTime()) return null
  return ts
}

// Aviso por Telegram de una reseña nueva pendiente de aprobar (ver lib/telegram.ts).
async function notifyNewReview(review: { name: string; role: string; rating: number; text: string }) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://dronesur.vercel.app'
  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)
  await notifyTelegram(
    `Nueva reseña pendiente de aprobar\n\n` +
      `${review.name}${review.role ? ` (${review.role})` : ''}\n` +
      `${stars}\n\n` +
      `${review.text}\n\n` +
      `Apruébala en: ${site}/admin`,
  )
}

// Limita los envíos públicos por persona. Se identifica por la IP, pero no se guarda la IP
// en claro: solo una huella (hash) que caduca a las 24 horas.
// Devuelve true si todavía puede enviar, false si ya llegó al límite.
async function allowPublicSubmit(req: Request): Promise<boolean> {
  const key = `dronesur:reviews:rl:${clientHash(req)}`
  // Primero se crea el contador con caducidad (solo si no existía) y luego se suma 1.
  // Así la caducidad queda siempre fijada, aunque algo falle a medias.
  await redis(['SET', key, '0', 'EX', String(WINDOW_SECONDS), 'NX'])
  const count = Number(await redis(['INCR', key]))
  return count <= MAX_PUBLIC_PER_DAY
}

function sanitizeReview(
  input: { name?: unknown; role?: unknown; rating?: unknown; text?: unknown },
  allowNoStars: boolean,
): { name: string; role: string; rating: number; text: string } | null {
  const name = String(input.name ?? '').trim().slice(0, MAX_NAME)
  const role = String(input.role ?? '').trim().slice(0, MAX_NAME)
  const text = String(input.text ?? '').trim().slice(0, MAX_TEXT)
  const rating = Math.round(Number(input.rating))
  if (!name || !text) return null
  const min = allowNoStars ? 0 : 1
  if (!Number.isFinite(rating) || rating < min || rating > 5) return null
  return { name, role, rating, text }
}

export async function GET(req: Request) {
  try {
    const reviews = await readAll()
    reviews.sort((a, b) => b.createdAt - a.createdAt)
    const visible = (await isAdmin(req)) ? reviews : reviews.filter((r) => r.approved !== false)
    return NextResponse.json(visible, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: Request) {
  let body: {
    action?: string
    review?: Record<string, unknown>
    id?: string
    approved?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return fail('Petición no válida', 400)
  }

  // Cualquier visitante puede enviar su opinión, sin contraseña. Queda pendiente de revisión.
  if (body.action === 'submit') {
    const clean = sanitizeReview(body.review ?? {}, false)
    if (!clean) return fail('Revisa el nombre, la puntuación y el texto de la opinión.', 400)
    try {
      if (!(await allowPublicSubmit(req))) {
        return fail('Has alcanzado el límite de opiniones enviadas. Inténtalo de nuevo mañana.', 429)
      }
      const newReview: Review = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...clean,
        source: 'public',
        approved: false,
        createdAt: Date.now(),
      }
      await changeAll((reviews) => [...reviews, newReview])
      await notifyNewReview(clean)
      return NextResponse.json({ ok: true, pending: true })
    } catch (e) {
      return serverError(e)
    }
  }

  // El resto de acciones son solo para el admin.
  const denied = await requireAdmin(req)
  if (denied) return denied

  if (body.action === 'add') {
    const clean = sanitizeReview(body.review ?? {}, true)
    if (!clean) return fail('Revisa el nombre y el texto de la opinión.', 400)
    try {
      const newReview: Review = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...clean,
        source: 'admin',
        approved: true,
        createdAt: parseReviewDate(body.review?.date) ?? Date.now(),
      }
      const updated = await changeAll((reviews) => [...reviews, newReview])
      return NextResponse.json({ reviews: updated })
    } catch (e) {
      return serverError(e)
    }
  }

  if (body.action === 'update') {
    const clean = sanitizeReview(body.review ?? {}, true)
    if (!clean || !body.id) return fail('Datos no válidos.', 400)
    try {
      const newDate = parseReviewDate(body.review?.date)
      const updated = await changeAll((reviews) =>
        reviews.map((r) =>
          r.id === body.id ? { ...r, ...clean, ...(newDate ? { createdAt: newDate } : {}) } : r,
        ),
      )
      return NextResponse.json({ reviews: updated })
    } catch (e) {
      return serverError(e)
    }
  }

  if (body.action === 'approve') {
    if (!body.id || typeof body.approved !== 'boolean') return fail('Datos no válidos.', 400)
    try {
      const updated = await changeAll((reviews) =>
        reviews.map((r) => (r.id === body.id ? { ...r, approved: body.approved } : r)),
      )
      return NextResponse.json({ reviews: updated })
    } catch (e) {
      return serverError(e)
    }
  }

  return fail('Acción no válida', 400)
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  try {
    const { id } = await req.json()
    const updated = await changeAll((reviews) => reviews.filter((r) => r.id !== id))
    return NextResponse.json({ reviews: updated })
  } catch (e) {
    return serverError(e)
  }
}
