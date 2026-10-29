import { NextResponse } from 'next/server'
import { readJSON, writeJSON, isAdmin, adminPasswordConfigured } from '@/lib/kv'

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
async function writeAll(reviews: Review[]) {
  await writeJSON(KEY, reviews)
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

// Aviso por Telegram cuando llega una reseña nueva pendiente de aprobar.
// Necesita las variables TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en Vercel.
// Si faltan o Telegram falla, no pasa nada: la reseña se guarda igualmente.
async function notifyTelegram(review: { name: string; role: string; rating: number; text: string }) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://dronesur.vercel.app'
  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)
  const text =
    `Nueva reseña pendiente de aprobar\n\n` +
    `${review.name}${review.role ? ` (${review.role})` : ''}\n` +
    `${stars}\n\n` +
    `${review.text}\n\n` +
    `Apruébala en: ${site}/admin`
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(4000),
    })
  } catch {
    // Se ignora: el aviso es un extra y nunca debe impedir guardar la reseña.
  }
}

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function serverError(e: unknown) {
  if (e instanceof Error && e.message === 'DB_NOT_CONFIGURED') {
    return fail('Falta conectar la base de datos (Upstash) en Vercel.', 500)
  }
  return fail('Error en el servidor al guardar los datos.', 500)
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
    const visible = isAdmin(req) ? reviews : reviews.filter((r) => r.approved !== false)
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
      const reviews = await readAll()
      const newReview: Review = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...clean,
        source: 'public',
        approved: false,
        createdAt: Date.now(),
      }
      await writeAll([...reviews, newReview])
      await notifyTelegram(clean)
      return NextResponse.json({ ok: true, pending: true })
    } catch (e) {
      return serverError(e)
    }
  }

  // El resto de acciones son solo para el admin.
  if (!adminPasswordConfigured()) {
    return fail('Falta configurar ADMIN_PASSWORD en Vercel.', 500)
  }
  if (!isAdmin(req)) return fail('Contraseña incorrecta', 401)

  if (body.action === 'add') {
    const clean = sanitizeReview(body.review ?? {}, true)
    if (!clean) return fail('Revisa el nombre y el texto de la opinión.', 400)
    try {
      const reviews = await readAll()
      const newReview: Review = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...clean,
        source: 'admin',
        approved: true,
        createdAt: parseReviewDate(body.review?.date) ?? Date.now(),
      }
      const updated = [...reviews, newReview]
      await writeAll(updated)
      return NextResponse.json({ reviews: updated })
    } catch (e) {
      return serverError(e)
    }
  }

  if (body.action === 'update') {
    const clean = sanitizeReview(body.review ?? {}, true)
    if (!clean || !body.id) return fail('Datos no válidos.', 400)
    try {
      const reviews = await readAll()
      const newDate = parseReviewDate(body.review?.date)
      const updated = reviews.map((r) =>
        r.id === body.id ? { ...r, ...clean, ...(newDate ? { createdAt: newDate } : {}) } : r,
      )
      await writeAll(updated)
      return NextResponse.json({ reviews: updated })
    } catch (e) {
      return serverError(e)
    }
  }

  if (body.action === 'approve') {
    if (!body.id || typeof body.approved !== 'boolean') return fail('Datos no válidos.', 400)
    try {
      const reviews = await readAll()
      const updated = reviews.map((r) =>
        r.id === body.id ? { ...r, approved: body.approved } : r,
      )
      await writeAll(updated)
      return NextResponse.json({ reviews: updated })
    } catch (e) {
      return serverError(e)
    }
  }

  return fail('Acción no válida', 400)
}

export async function DELETE(req: Request) {
  if (!isAdmin(req)) return fail('Contraseña incorrecta', 401)
  try {
    const { id } = await req.json()
    const reviews = await readAll()
    const updated = reviews.filter((r) => r.id !== id)
    await writeAll(updated)
    return NextResponse.json({ reviews: updated })
  } catch (e) {
    return serverError(e)
  }
}
