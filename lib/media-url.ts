// Ayudantes para las URLs de fotos, vídeos, panorámicas 360°, modelos 3D y enlaces incrustados.

// ---------- Vídeos ----------
// Los iPhone graban en HEVC (H.265), un formato que muchos portátiles con Windows no pueden
// reproducir en Chrome o Edge: el vídeo sale en negro. Para evitarlo, pedimos a Cloudinary que
// sirva una copia en H.264 (MP4), que lee cualquier navegador.
// (En el plan gratuito solo convierte vídeos de hasta 40 MB.)
export function playableVideoUrl(url: string): string {
  if (!url.includes('res.cloudinary.com/') || !url.includes('/video/upload/')) return url
  if (/\/video\/upload\/[^/]*vc_/.test(url)) return url // ya trae su propia transformación
  return url
    .replace('/video/upload/', '/video/upload/vc_h264,q_auto/')
    .replace(/\.[a-z0-9]+(\?.*)?$/i, '.mp4')
}

// ---------- Fotos 360° ----------
// Limita el ancho a 5000 px y optimiza el peso: carga más rápido y funciona en móviles
// antiguos (que no aguantan texturas gigantes).
export function panoramaUrl(url: string): string {
  if (!url.includes('res.cloudinary.com/') || !url.includes('/image/upload/')) return url
  if (/\/image\/upload\/[a-z]+_/.test(url)) return url
  return url.replace('/image/upload/', '/image/upload/c_limit,w_5000,q_auto/')
}

// Miniatura pequeña de una foto de Cloudinary (para las tiras de miniaturas).
export function thumbUrl(url: string): string {
  if (!url.includes('res.cloudinary.com/') || !url.includes('/image/upload/')) return url
  if (/\/image\/upload\/[a-z]+_/.test(url)) return url
  return url.replace('/image/upload/', '/image/upload/c_fill,w_400,h_225,q_auto/')
}

// ---------- Enlaces incrustados ----------
// Solo se admiten estos servicios. Evita que alguien meta una web cualquiera en tu página.
export const EMBED_HOSTS = ['sketchfab.com', 'www.sketchfab.com', 'kuula.co', 'www.kuula.co', 'my.matterport.com']

export function isAllowedEmbed(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && EMBED_HOSTS.includes(u.hostname)
  } catch {
    return false
  }
}

export function embedProvider(url: string): string {
  try {
    const host = new URL(url).hostname
    if (host.endsWith('sketchfab.com')) return 'Sketchfab'
    if (host.endsWith('kuula.co')) return 'Kuula'
    if (host.endsWith('matterport.com')) return 'Matterport'
  } catch {}
  return 'un servicio externo'
}

// Si pegas la dirección normal de un modelo de Sketchfab, la convierte en la de incrustar.
export function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.endsWith('sketchfab.com')) {
      if (u.pathname.endsWith('/embed')) return url
      const m = u.pathname.match(/([0-9a-f]{32})/i)
      if (m) return `https://sketchfab.com/models/${m[1]}/embed`
    }
  } catch {}
  return url
}
