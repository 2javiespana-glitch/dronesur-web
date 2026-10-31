import { NextResponse } from 'next/server'
import { readJSON, updateJSON } from '@/lib/kv'
import { categorySlugs } from '@/lib/categories-db'
import { fail, serverError, requireAdmin } from '@/lib/api'

// Álbumes = "carpetas" dentro de una categoría (ej. dentro de "Eventos": la boda de
// García-Pérez, la comunión de Pedro...). Cada foto/vídeo se puede asociar a un álbum
// usando su "id" (ver app/api/media/route.ts, campo albumId).
//
// - GET    -> devuelve todos los álbumes (público, los usan las subpáginas de categoría)
// - POST   -> { action: 'add', album: { category, title } }  crea un álbum (solo admin)
// - DELETE -> { id }  borra un álbum Y todas las fotos/vídeos que tuviera dentro (solo admin)

export const dynamic = 'force-dynamic'

const ALBUMS_KEY = 'dronesur:albums'
const MEDIA_KEY = 'dronesur:media'

type Album = {
  id: string
  category: string
  title: string
  createdAt: number
}

type MediaItem = { id: string; albumId?: string; [k: string]: unknown }

export async function GET() {
  try {
    const albums = await readJSON<Album[]>(ALBUMS_KEY, [])
    return NextResponse.json(albums, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  let body: { action?: string; album?: Partial<Album> }
  try {
    body = await req.json()
  } catch {
    return fail('Petición no válida', 400)
  }

  if (body.action !== 'add') return fail('Acción no válida', 400)

  const album = body.album
  const title = String(album?.title ?? '').trim()
  if (!title) return fail('Ponle un nombre al álbum.', 400)

  try {
    // Vale cualquier categoría de servicio que exista (incluidas las creadas desde el admin).
    const slugs = await categorySlugs()
    if (!album?.category || !slugs.includes(album.category)) {
      return fail('Categoría no válida', 400)
    }
    const newAlbum: Album = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      category: album.category,
      title: title.slice(0, 120),
      createdAt: Date.now(),
    }
    const updated = await updateJSON<Album[]>(ALBUMS_KEY, [], (albums) => [...albums, newAlbum])
    return NextResponse.json({ albums: updated })
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  try {
    const { id } = await req.json()

    const updatedAlbums = await updateJSON<Album[]>(ALBUMS_KEY, [], async (albums) => {
      // Al borrar un álbum, se borran también las fotos/vídeos que tuviera dentro,
      // para no dejar archivos "huérfanos" sin carpeta.
      await updateJSON<MediaItem[]>(MEDIA_KEY, [], (media) => media.filter((m) => m.albumId !== id))
      return albums.filter((a) => a.id !== id)
    })

    return NextResponse.json({ albums: updatedAlbums })
  } catch (e) {
    return serverError(e)
  }
}
