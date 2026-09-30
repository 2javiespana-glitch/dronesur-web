import { NextResponse } from 'next/server'
import { readJSON, writeJSON, isAdmin, adminPasswordConfigured } from '@/lib/kv'

// Esta ruta guarda y lee la lista de fotos y vídeos (con su categoría, y opcionalmente
// su álbum) en una base de datos Upstash Redis, para que TODOS los visitantes vean lo
// mismo (no solo tu navegador).
//
// - GET     -> devuelve la lista (pública, la usan el hero, las portadas y las subpáginas)
// - POST    -> { action: 'check' }  comprueba la contraseña del admin
//              { action: 'add', item } añade una foto o vídeo (solo admin)
// - DELETE  -> { id } borra un elemento (solo admin)

export const dynamic = 'force-dynamic'

const KEY = 'dronesur:media'

// Categorías de "trabajo" (las que tienen subpágina propia con álbumes)
const JOB_CATEGORIES = ['inmobiliaria', 'eventos', 'fotogrametria', 'obra', 'aerea']
// Categorías especiales: el carrusel de inicio, y la "portada" de cada tarjeta de servicio
const SPECIAL_CATEGORIES = ['hero', ...JOB_CATEGORIES.map((c) => `cover-${c}`)]
const ALLOWED_CATEGORIES = [...JOB_CATEGORIES, ...SPECIAL_CATEGORIES]

type MediaItem = {
  id: string
  title: string
  url: string
  category: string
  type: 'image' | 'video'
  albumId?: string
}

async function readAll(): Promise<MediaItem[]> {
  return readJSON<MediaItem[]>(KEY, [])
}

async function writeAll(items: MediaItem[]) {
  await writeJSON(KEY, items)
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
  if (!adminPasswordConfigured()) {
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
        ...(item.albumId ? { albumId: String(item.albumId) } : {}),
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
