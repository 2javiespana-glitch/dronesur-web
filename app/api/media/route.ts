import { NextResponse } from 'next/server'
import { readJSON, updateJSON } from '@/lib/kv'
import { categorySlugs } from '@/lib/categories-db'
import { fail, serverError, requireAdmin } from '@/lib/api'
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

// Las categorías de servicio se crean/ocultan desde el admin, así que comprobamos
// contra la lista real guardada en la base de datos (ver lib/categories-db.ts).
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

export async function GET() {
  try {
    const items = await readJSON<MediaItem[]>(KEY, [])
    return NextResponse.json(items, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    // Si la base de datos aún no está conectada, la web no se rompe: simplemente no hay medios.
    return NextResponse.json([])
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req)
  if (denied) return denied

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
    try {
      if (!item.category || !(await isAllowedCategory(item.category))) {
        return fail('Categoría no válida', 400)
      }
      const ALLOWED_TYPES = ['image', 'video', 'panorama', 'model3d', 'embed'] as const
      const mediaType = ALLOWED_TYPES.find((t) => t === item.type) ?? 'video'
      if (mediaType === 'embed' && !isAllowedEmbed(item.url)) {
        return fail('Solo se admiten enlaces de Sketchfab, Kuula o Matterport.', 400)
      }
      const newItem: MediaItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: String(item.title ?? '').slice(0, 200),
        url: item.url,
        category: item.category,
        type: mediaType,
        ...(item.albumId ? { albumId: String(item.albumId) } : {}),
      }
      const updated = await updateJSON<MediaItem[]>(KEY, [], (items) => [...items, newItem])
      return NextResponse.json({ items: updated })
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
    const updated = await updateJSON<MediaItem[]>(KEY, [], (items) => items.filter((m) => m.id !== id))
    return NextResponse.json({ items: updated })
  } catch (e) {
    return serverError(e)
  }
}
