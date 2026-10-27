import { NextResponse } from 'next/server'
import { readJSON, writeJSON, isAdmin, adminPasswordConfigured } from '@/lib/kv'
import { CATEGORIES as SEED_CATEGORIES } from '@/lib/content'
import { isAllowedEmbed } from '@/lib/media-url'

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
const CATEGORIES_KEY = 'dronesur:categories'

// Las categorías de servicio ahora se crean/borran desde el admin, así que comprobamos
// contra la lista real guardada en la base de datos (o las 5 de siempre si nunca se ha
// guardado nada todavía), en vez de una lista fija en el código.
async function categorySlugs(): Promise<string[]> {
  const saved = await readJSON<{ slug: string }[] | null>(CATEGORIES_KEY, null)
  const list = saved === null ? SEED_CATEGORIES : saved
  return list.map((c) => c.slug)
}

async function isAllowedCategory(category: string): Promise<boolean> {
  if (category === 'hero') return true
  const slugs = await categorySlugs()
  if (slugs.includes(category)) return true
  if (category.startsWith('cover-') && slugs.includes(category.replace('cover-', ''))) return true
  return false
}

type MediaItem = {
  id: string
  title: string
  url: string
  category: string
  type: 'image' | 'video' | 'panorama' | 'model3d' | 'embed'
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
    if (!item.category || !(await isAllowedCategory(item.category))) {
      return fail('Categoría no válida', 400)
    }
    const ALLOWED_TYPES = ['image', 'video', 'panorama', 'model3d', 'embed'] as const
    const mediaType = ALLOWED_TYPES.find((t) => t === item.type) ?? 'video'
    if (mediaType === 'embed' && !isAllowedEmbed(item.url)) {
      return fail('Solo se admiten enlaces de Sketchfab, Kuula o Matterport.', 400)
    }
    try {
      const items = await readAll()
      const newItem: MediaItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: String(item.title ?? '').slice(0, 200),
        url: item.url,
        category: item.category,
        type: mediaType,
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
