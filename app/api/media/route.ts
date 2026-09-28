import { NextResponse } from 'next/server'

// Esta ruta guarda y lee la lista de fotos y vídeos (con su categoría) en una base de datos
// Upstash Redis, para que TODOS los visitantes vean lo mismo (no solo tu navegador).
//
// - GET     -> devuelve la lista (pública, la usan el hero y las subpáginas)
// - POST    -> { action: 'check' }  comprueba la contraseña del admin
//              { action: 'add', item } añade una foto o vídeo (solo admin)
// - DELETE  -> { id } borra un elemento (solo admin)

export const dynamic = 'force-dynamic'

const KEY = 'dronesur:media'
const ALLOWED_CATEGORIES = ['hero', 'inmobiliaria', 'eventos', 'fotogrametria', 'obra', 'aerea']

type MediaItem = {
  id: string
  title: string
  url: string
  category: string
  type: 'image' | 'video'
}

// Vercel puede llamar a las variables de una forma u otra según la integración,
// así que aceptamos las dos.
function dbConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('DB_NOT_CONFIGURED')
  return { url, token }
}

async function redis(command: string[]) {
  const { url, token } = dbConfig()
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.result
}

async function readAll(): Promise<MediaItem[]> {
  const raw = await redis(['GET', KEY])
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeAll(items: MediaItem[]) {
  await redis(['SET', KEY, JSON.stringify(items)])
}

function isAdmin(req: Request) {
  const expected = process.env.ADMIN_PASSWORD
  return !!expected && req.headers.get('x-admin-password') === expected
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

export async function GET() {
  try {
    const items = await readAll()
    return NextResponse.json(items, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    // Si la base de datos aún no está conectada, la web no se rompe: simplemente no hay medios.
    return NextResponse.json([])
  }
}

export async function POST(req: Request) {
  if (!process.env.ADMIN_PASSWORD) {
    return fail('Falta configurar ADMIN_PASSWORD en Vercel (Settings > Environment Variables).', 500)
  }
  if (!isAdmin(req)) return fail('Contraseña incorrecta', 401)

  let body: { action?: string; item?: Partial<MediaItem> }
  try {
    body = await req.json()
  } catch {
    return fail('Petición no válida', 400)
  }

  if (body.action === 'check') return NextResponse.json({ ok: true })

  if (body.action === 'add') {
    const item = body.item
    if (!item || typeof item.url !== 'string' || !item.url.startsWith('https://')) {
      return fail('La URL debe empezar por https://', 400)
    }
    if (!item.category || !ALLOWED_CATEGORIES.includes(item.category)) {
      return fail('Categoría no válida', 400)
    }
    try {
      const items = await readAll()
      const newItem: MediaItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: String(item.title ?? '').slice(0, 200),
        url: item.url,
        category: item.category,
        type: item.type === 'image' ? 'image' : 'video',
      }
      const updated = [...items, newItem]
      await writeAll(updated)
      return NextResponse.json({ items: updated })
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
    const items = await readAll()
    const updated = items.filter((m) => m.id !== id)
    await writeAll(updated)
    return NextResponse.json({ items: updated })
  } catch (e) {
    return serverError(e)
  }
}
