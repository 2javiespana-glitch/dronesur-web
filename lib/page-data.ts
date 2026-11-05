import { CATEGORIES, type Category } from '@/lib/content'
import { readCategories } from '@/lib/categories-db'
import { readJSON } from '@/lib/kv'
import type { AlbumItem, MediaItem } from '@/lib/media-admin'

// Lecturas del servidor que comparten las páginas de servicio en español y en inglés.

export async function loadCategoriesSafe(): Promise<Category[]> {
  try {
    return await readCategories()
  } catch {
    // Si la base de datos no responde, la web sigue con las categorías de siempre.
    return CATEGORIES
  }
}

// Fotos/vídeos y álbumes de una categoría, para que lleguen ya en el HTML (así Google los ve).
export async function loadGallery(slug: string): Promise<{ media: MediaItem[]; albums: AlbumItem[] }> {
  try {
    const [media, albums] = await Promise.all([
      readJSON<MediaItem[]>('dronesur:media', []),
      readJSON<AlbumItem[]>('dronesur:albums', []),
    ])
    return {
      media: media.filter((m) => m.category === slug),
      albums: albums.filter((a) => a.category === slug),
    }
  } catch {
    return { media: [], albums: [] }
  }
}

const DEFAULT_SHARE_IMAGE = '/opengraph-image.jpg'

// La imagen que se ve al compartir el enlace de una categoría (WhatsApp, Instagram...):
// su portada, recortada a 1200 × 630. Si no tiene portada, la imagen general de la web.
export async function shareImageFor(slug: string): Promise<string> {
  try {
    const media = await readJSON<MediaItem[]>('dronesur:media', [])
    const covers = media.filter(
      (m) => m.category === `cover-${slug}` && (m.type === 'image' || !m.type) && m.url.startsWith('https://'),
    )
    const cover = covers[covers.length - 1]
    if (!cover) return DEFAULT_SHARE_IMAGE
    if (cover.url.includes('res.cloudinary.com/') && cover.url.includes('/image/upload/')) {
      if (/\/image\/upload\/[a-z]+_/.test(cover.url)) return cover.url
      return cover.url.replace('/image/upload/', '/image/upload/c_fill,w_1200,h_630,q_auto,f_jpg/')
    }
    return cover.url
  } catch {
    return DEFAULT_SHARE_IMAGE
  }
}
