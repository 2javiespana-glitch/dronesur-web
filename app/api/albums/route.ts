import { NextResponse } from 'next/server'
import { readJSON, writeJSON, isAdmin, adminPasswordConfigured } from '@/lib/kv'

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
const JOB_CATEGORIES = ['inmobiliaria', 'eventos', 'fotogrametria', 'obra', 'aerea']

type Album = {
  id: string
  category: string
  title: string
  createdAt: number
}

type MediaItem = { id: string; albumId?: string; [k: string]: unknown }

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
    const albums = await readJSON<Album[]>(ALBUMS_KEY, [])
    return NextResponse.json(albums, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: Request) {
  if (!adminPasswordConfigured()) {
    return fail('Falta configurar ADMIN_PASSWORD en Vercel.', 500)
  }
  if (!isAdmin(req)) return fail('Contraseña incorrecta', 401)

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
  if (!album?.category || !JOB_CATEGORIES.includes(album.category)) {
    return fail('Categoría no válida', 400)
  }

  try {
    const albums = await readJSON<Album[]>(ALBUMS_KEY, [])
    const newAlbum: Album = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      category: album.category,
      title: title.slice(0, 120),
      createdAt: Date.now(),
    }
    const updated = [...albums, newAlbum]
    await writeJSON(ALBUMS_KEY, updated)
    return NextResponse.json({ albums: updated })
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(req: Request) {
  if (!isAdmin(req)) return fail('Contraseña incorrecta', 401)
  try {
    const { id } = await req.json()

    const albums = await readJSON<Album[]>(ALBUMS_KEY, [])
    const updatedAlbums = albums.filter((a) => a.id !== id)
    await writeJSON(ALBUMS_KEY, updatedAlbums)

    // Al borrar un álbum, se borran también las fotos/vídeos que tuviera dentro,
    // para no dejar archivos "huérfanos" sin carpeta.
    const media = await readJSON<MediaItem[]>(MEDIA_KEY, [])
    const updatedMedia = media.filter((m) => m.albumId !== id)
    await writeJSON(MEDIA_KEY, updatedMedia)

    return NextResponse.json({ albums: updatedAlbums })
  } catch (e) {
    return serverError(e)
  }
}
