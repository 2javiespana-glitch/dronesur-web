import { thumbUrl } from '@/lib/media-url'
import { optimizeImage } from '@/lib/site-content'

// Tipos y ayudas del gestor de fotos y vídeos del admin (components/media-manager.tsx).

export type MediaKind = 'image' | 'video' | 'panorama' | 'model3d' | 'embed'

export type MediaItem = {
  id: string
  title: string
  url: string
  category: string // 'hero', el slug de una categoría, o 'cover-<slug>' (portada de la tarjeta)
  type?: MediaKind // los elementos antiguos sin tipo eran vídeos
  albumId?: string
  alt?: string // descripción de la foto en español (para Google y lectores de pantalla)
  altEn?: string // lo mismo en inglés
  linkSlug?: string // solo vídeos del carrusel: slug de la categoría a la que lleva el botón del carrusel
}

export type AlbumItem = { id: string; category: string; title: string; createdAt: number }

// Qué se va a subir: foto/vídeo normal, foto 360° o modelo 3D.
export type UploadKind = 'normal' | 'panorama' | 'model3d'

export function kindOf(item: MediaItem): MediaKind {
  return item.type ?? 'video'
}

// Cloudinary puede sacar una foto de portada de cualquier vídeo cambiando la extensión a .jpg
function videoThumb(url: string): string | null {
  if (!url.includes('res.cloudinary.com/') || !url.includes('/video/upload/')) return null
  const withSize = /\/video\/upload\/[a-z]+_/.test(url)
    ? url
    : url.replace('/video/upload/', '/video/upload/c_fill,w_480,h_360,q_auto/')
  return withSize.replace(/\.[a-z0-9]+(\?.*)?$/i, '.jpg')
}

// Miniatura para enseñar en el panel (null = no hay, se muestra un icono).
export function thumbnailOf(item: MediaItem): string | null {
  const kind = kindOf(item)
  if (kind === 'image') return optimizeImage(item.url, 480)
  if (kind === 'panorama') return thumbUrl(item.url)
  if (kind === 'video') return videoThumb(item.url)
  return null
}

export function kindLabel(kind: MediaKind): string {
  if (kind === 'image') return 'Foto'
  if (kind === 'video') return 'Vídeo'
  if (kind === 'panorama') return 'Foto 360°'
  if (kind === 'model3d') return 'Modelo 3D'
  return 'Enlace incrustado'
}

export function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}

// Comprueba el archivo antes de subirlo. Devuelve el motivo si no vale, o null si está bien.
// (Los límites son los del plan gratuito de Cloudinary.)
export function checkFile(file: File, kind: UploadKind): string | null {
  if (kind === 'model3d') {
    if (!/\.glb$/i.test(file.name)) {
      return `"${file.name}" no es un modelo .glb. Exporta tu modelo en formato GLB (un único archivo).`
    }
    if (file.size > 10 * 1024 * 1024) {
      return `"${file.name}" pesa más de 10 MB. Optimízalo (menos polígonos y texturas más pequeñas) o súbelo a Sketchfab y usa «Enlace incrustado».`
    }
    return null
  }
  if (kind === 'panorama' && !file.type.startsWith('image/')) {
    return `"${file.name}" no es una foto. Para una foto 360° sube una imagen (JPG).`
  }
  const isVideo = file.type.startsWith('video/')
  if (!isVideo && !file.type.startsWith('image/')) {
    return `"${file.name}" no es una foto ni un vídeo.`
  }
  const maxMb = isVideo ? 100 : 10
  if (file.size > maxMb * 1024 * 1024) {
    return `"${file.name}" pesa ${(file.size / (1024 * 1024)).toFixed(0)} MB. El plan gratuito de Cloudinary acepta hasta ${maxMb} MB por ${isVideo ? 'vídeo' : 'foto'}. Comprímelo y vuelve a intentarlo.`
  }
  return null
}
