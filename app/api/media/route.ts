import { after, NextResponse } from 'next/server'
import { readJSON, updateJSON } from '@/lib/kv'
import { categorySlugs } from '@/lib/categories-db'
import { fail, serverError, requireAdmin } from '@/lib/api'
import { isAllowedEmbed } from '@/lib/media-url'
import { warmVideoVariants } from '@/lib/video-warmup'

// Esta ruta guarda y lee la lista de fotos y vídeos (con su categoría, y opcionalmente
// su álbum) en una base de datos Upstash Redis, para que TODOS los visitantes vean lo
// mismo (no solo tu navegador).
//
// - GET     -> devuelve la lista (pública, la usan el hero, las portadas y las subpáginas)
// - POST    -> { action: 'check' }  comprueba la contraseña del admin
//              { action: 'update', id, alt, altEn } escribe la descripción de una foto (solo admin)
//              { action: 'add', item } añade una foto o vídeo (solo admin)
//              { action: 'reorder', category, ids } cambia el orden de las tomas de una categoría (solo admin)
// - DELETE  -> { id } borra un elemento (solo admin)

export const dynamic = 'force-dynamic'
// Tiempo máximo de la ruta (segundos): deja margen para preparar los vídeos nuevos (ver lib/video-warmup.ts).
export const maxDuration = 60

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
  alt?: string // descripción de la foto (para Google y lectores de pantalla)
  altEn?: string
  linkSlug?: string // solo vídeos del carrusel: categoría a la que lleva su botón
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

  let body: {
    action?: string
    item?: Partial<MediaItem>
    id?: string
    alt?: unknown
    altEn?: unknown
    linkSlug?: unknown
    category?: unknown
    ids?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return fail('Petición no válida', 400)
  }

  if (body.action === 'check') return NextResponse.json({ ok: true })

  // La descripción ("texto alternativo") de una foto: es lo que lee Google y los lectores de pantalla.
  if (body.action === 'update') {
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) return fail('Falta la foto.', 400)
    const clean = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, 200) : '')
    const alt = clean(body.alt)
    const altEn = clean(body.altEn)
    const touchesAlt = body.alt !== undefined || body.altEn !== undefined
    // Categoría a la que lleva el botón de un vídeo del carrusel (vacío = sin botón).
    const touchesLink = body.linkSlug !== undefined
    const linkSlug = typeof body.linkSlug === 'string' ? body.linkSlug.trim() : ''
    try {
      if (touchesLink && linkSlug && !(await isAllowedCategory(linkSlug))) {
        return fail('Categoría no válida', 400)
      }
      const updated = await updateJSON<MediaItem[]>(KEY, [], (items) =>
        items.map((m) => {
          if (m.id !== id) return m
          const next: MediaItem = { ...m }
          if (touchesAlt) {
            if (alt) next.alt = alt
            else delete next.alt
            if (altEn) next.altEn = altEn
            else delete next.altEn
          }
          if (touchesLink) {
            if (linkSlug) next.linkSlug = linkSlug
            else delete next.linkSlug
          }
          return next
        }),
      )
      return NextResponse.json({ items: updated })
    } catch (e) {
      return serverError(e)
    }
  }

  // Orden de las tomas de una categoría (se usa en el carrusel de inicio): `ids` es la lista de vídeos en el orden
  // nuevo. Las tomas de esa categoría ocupan los mismos huecos de la lista; el resto de elementos no se mueven.
  if (body.action === 'reorder') {
    const category = typeof body.category === 'string' ? body.category : ''
    const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === 'string') : []
    if (!category || ids.length === 0 || ids.length > 500) return fail('Orden no válido', 400)
    try {
      const updated = await updateJSON<MediaItem[]>(KEY, [], (items) => {
        const inCategory = items.filter((m) => m.category === category)
        const byId = new Map(inCategory.map((m) => [m.id, m]))
        const wanted = ids.filter((id, i) => byId.has(id) && ids.indexOf(id) === i).map((id) => byId.get(id) as MediaItem)
        // Lo que no venga en la lista (por ejemplo, un vídeo subido a la vez) se queda al final, en su orden.
        const rest = inCategory.filter((m) => !wanted.includes(m))
        const ordered = [...wanted, ...rest]
        let k = 0
        return items.map((m) => (m.category === category ? ordered[k++] : m))
      })
      return NextResponse.json({ items: updated })
    } catch (e) {
      return serverError(e)
    }
  }

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
      // Vídeo nuevo del carrusel: se pide ya a Cloudinary que prepare sus copias (móvil y escritorio),
      // DESPUÉS de responder al admin, para que el primer visitante no tenga que esperar.
      if (newItem.type === 'video' && newItem.category === 'hero') {
        try {
          after(() => warmVideoVariants(newItem.url))
        } catch {
          // si no se puede programar, no pasa nada: la web funciona igual
        }
      }
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
