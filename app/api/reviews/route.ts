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
        createdAt: Date.now(),
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
      const updated = reviews.map((r) => (r.id === body.id ? { ...r, ...clean } : r))
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
