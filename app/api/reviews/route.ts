import { NextResponse } from 'next/server'
import { readJSON, writeJSON, isAdmin, adminPasswordConfigured } from '@/lib/kv'

// Reseñas de clientes.
// - GET    -> devuelve todas las reseñas (público, las usa la sección de Reseñas)
// - POST   -> { action: 'submit', review }  cualquier visitante puede dejar la suya
//             { action: 'add', review }     el admin añade una reseña a mano
//             { action: 'update', id, review } el admin edita una reseña existente
// - DELETE -> { id }  el admin borra una reseña

export const dynamic = 'force-dynamic'

const KEY = 'dronesur:reviews'
const MAX_NAME = 80
const MAX_TEXT = 600

export type Review = {
  id: string
  name: string
  role: string // ej. "Cliente inmobiliaria", "Boda mayo 2026"... puede ir vacío
  rating: number // 1 a 5
  text: string
  source: 'public' | 'admin'
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

function sanitizeReview(input: {
  name?: unknown
  role?: unknown
  rating?: unknown
  text?: unknown
}): { name: string; role: string; rating: number; text: string } | null {
  const name = String(input.name ?? '').trim().slice(0, MAX_NAME)
  const role = String(input.role ?? '').trim().slice(0, MAX_NAME)
  const text = String(input.text ?? '').trim().slice(0, MAX_TEXT)
  const rating = Math.round(Number(input.rating))
  if (!name) return null
  if (!text) return null
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null
  return { name, role, rating, text }
}

export async function GET() {
  try {
    const reviews = await readAll()
    // Más recientes primero
    reviews.sort((a, b) => b.createdAt - a.createdAt)
    return NextResponse.json(reviews, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: Request) {
  let body: { action?: string; review?: Record<string, unknown>; id?: string }
  try {
    body = await req.json()
  } catch {
    return fail('Petición no válida', 400)
  }

  // Cualquier visitante puede dejar su reseña, sin necesidad de contraseña.
  if (body.action === 'submit') {
    const clean = sanitizeReview(body.review ?? {})
    if (!clean) return fail('Revisa el nombre, la puntuación y el texto de la reseña.', 400)
    try {
      const reviews = await readAll()
      const newReview: Review = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...clean,
        source: 'public',
        createdAt: Date.now(),
      }
      const updated = [...reviews, newReview]
      await writeAll(updated)
      return NextResponse.json({ review: newReview })
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
    const clean = sanitizeReview(body.review ?? {})
    if (!clean) return fail('Revisa el nombre, la puntuación y el texto de la reseña.', 400)
    try {
      const reviews = await readAll()
      const newReview: Review = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...clean,
        source: 'admin',
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
    const clean = sanitizeReview(body.review ?? {})
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
