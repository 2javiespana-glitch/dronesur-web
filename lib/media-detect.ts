// Detector automático del tipo de archivo que se suelta en el gestor de fotos y vídeos del admin.
// Decide si es una foto normal, un vídeo, una foto 360° o un modelo 3D (.glb) sin que haya que elegirlo.
// Solo lee el archivo en el navegador: no sube nada. Lo usa components/media-manager.tsx.

import { isImageFile as isImage, isVideoFile as isVideo, VIDEO_EXT, type UploadKind } from '@/lib/media-admin'

export type Detection =
  | {
      ok: true
      /** Cómo se sube: 'normal' = foto o vídeo (se distingue al subir), 'panorama' o 'model3d'. */
      kind: UploadKind
      /** Nombre para mostrar: «Foto», «Vídeo», «Foto 360°» o «Modelo 3D». */
      label: string
      /** Por qué se ha decidido así (se enseña al administrador). */
      reason: string
      /** 'high' = metadatos o nombre claros; 'medium' = solo por la proporción 2:1. */
      confidence: 'high' | 'medium'
    }
  | { ok: false; error: string }

const NAME_HINT = /(^|[^a-z0-9])(pano|panorama|panoramica|360|sphere|spherical|esfera|equirect(angular)?)([^a-z0-9]|$)/i

// Cuánto del principio del archivo se lee buscando metadatos 360° (el XMP está siempre al principio).
const HEAD_BYTES = 256 * 1024

// Un .glb de verdad empieza por los cuatro bytes "glTF". Así se distingue de un archivo renombrado.
async function hasGlbHeader(file: File): Promise<boolean> {
  try {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer())
    return head.length === 4 && String.fromCharCode(...head) === 'glTF'
  } catch {
    return false
  }
}

// Las fotos 360° (dron, cámaras 360°, Google Fotos…) llevan escrito en el XMP que son esféricas.
async function hasPanoramaMetadata(file: File): Promise<boolean> {
  try {
    const bytes = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer())
    let text = ''
    for (let i = 0; i < bytes.length; i += 8192) {
      text += String.fromCharCode(...bytes.subarray(i, i + 8192))
    }
    return (
      /ProjectionType\s*=\s*["']equirectangular["']/i.test(text) ||
      /<GPano:ProjectionType>\s*equirectangular\s*</i.test(text) ||
      /UsePanoramaViewer\s*=\s*["']True["']/i.test(text) ||
      /<GPano:UsePanoramaViewer>\s*True\s*</i.test(text)
    )
  } catch {
    return false
  }
}

// Ancho y alto sin tener que subir la foto. Devuelve null si el navegador no la sabe abrir (HEIC, etc.).
async function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file)
      const size = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      return size
    }
  } catch {
    // se prueba con el método clásico
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      resolve(null)
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

export async function detectFile(file: File): Promise<Detection> {
  // ----- Modelo 3D -----
  if (/\.glb$/i.test(file.name) || file.type === 'model/gltf-binary') {
    if (!(await hasGlbHeader(file))) {
      return { ok: false, error: `"${file.name}" no es un modelo .glb válido (el archivo está dañado o tiene otro formato).` }
    }
    return { ok: true, kind: 'model3d', label: 'Modelo 3D', reason: 'archivo .glb', confidence: 'high' }
  }
  if (/\.(gltf|obj|fbx|stl|usdz|3ds|dae|blend)$/i.test(file.name)) {
    return {
      ok: false,
      error: `"${file.name}" no se puede subir tal cual. Expórtalo en formato GLB (un único archivo .glb) o súbelo a Sketchfab y pega el enlace.`,
    }
  }

  // ----- Vídeo -----
  if (isVideo(file)) {
    return { ok: true, kind: 'normal', label: 'Vídeo', reason: 'archivo de vídeo', confidence: 'high' }
  }

  // ----- Imagen: normal o 360° -----
  if (isImage(file)) {
    if (await hasPanoramaMetadata(file)) {
      return { ok: true, kind: 'panorama', label: 'Foto 360°', reason: 'trae metadatos de foto esférica', confidence: 'high' }
    }

    const size = await imageSize(file)
    if (size && size.height > 0) {
      const ratio = size.width / size.height
      const isTwoToOne = Math.abs(ratio - 2) <= 0.02 // 2:1 exacto, con un pelín de margen
      const nearTwoToOne = Math.abs(ratio - 2) <= 0.1
      const hinted = NAME_HINT.test(file.name)

      if (hinted && nearTwoToOne && size.width >= 1500) {
        return {
          ok: true,
          kind: 'panorama',
          label: 'Foto 360°',
          reason: `el nombre lo indica y la proporción es 2:1 (${size.width}×${size.height})`,
          confidence: 'high',
        }
      }
      if (isTwoToOne && size.width >= 2000) {
        return {
          ok: true,
          kind: 'panorama',
          label: 'Foto 360°',
          reason: `proporción 2:1 (${size.width}×${size.height})`,
          confidence: 'medium',
        }
      }
    }
    return { ok: true, kind: 'normal', label: 'Foto', reason: 'foto normal', confidence: 'high' }
  }

  return { ok: false, error: `"${file.name}" no es una foto, un vídeo ni un modelo .glb.` }
}

// Lo que se puede soltar como enlace en lugar de como archivo (Sketchfab, Kuula, Matterport o una foto/vídeo alojado fuera).
export type LinkDetection = { kind: 'embed' | 'url'; label: string; url: string } | null

export function detectLink(raw: string, isAllowedEmbed: (url: string) => boolean): LinkDetection {
  const url = raw.trim()
  if (!/^https:\/\//i.test(url)) return null
  if (isAllowedEmbed(url)) return { kind: 'embed', label: 'Enlace incrustado', url }
  if (/\.(jpe?g|png|webp|avif|gif|mp4|mov|webm|m4v)(\?|#|$)/i.test(url)) {
    return { kind: 'url', label: VIDEO_EXT.test(url.split(/[?#]/)[0]) ? 'Vídeo' : 'Foto', url }
  }
  return null
}
