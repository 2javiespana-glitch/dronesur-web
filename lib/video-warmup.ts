import { MOBILE_VIDEO_WIDTH, playableVideoUrl } from '@/lib/media-url'

// Cuando subes un vídeo al carrusel, Cloudinary tiene que preparar las copias que pide la web
// (la de móvil, reducida, y la de escritorio) la PRIMERA vez que alguien las pide, y con vídeos
// tan pesados eso puede tardar. Esta función las pide justo al añadir el vídeo desde el admin,
// para que ese trabajo ya esté hecho cuando llegue el primer visitante.
//
// Si algo falla (red, límite de Cloudinary, tiempo), no pasa nada: se ignora y la web funciona
// igual, solo que la primera visita tardaría un poco más.
export async function warmVideoVariants(url: string): Promise<void> {
  let host = ''
  try {
    host = new URL(url).hostname
  } catch {
    return
  }
  // Solo vídeos de tu Cloudinary (nunca una dirección cualquiera).
  if (host !== 'res.cloudinary.com') return

  const variants = [playableVideoUrl(url, MOBILE_VIDEO_WIDTH), playableVideoUrl(url)].filter((v) => v !== url)

  await Promise.allSettled(
    variants.map(async (variant) => {
      try {
        // Basta con pedir el primer byte: Cloudinary prepara la copia entera antes de responder.
        const res = await fetch(variant, {
          headers: { Range: 'bytes=0-0' },
          cache: 'no-store',
          signal: AbortSignal.timeout(55_000),
        })
        await res.body?.cancel()
      } catch {
        // se ignora a propósito
      }
    }),
  )
}
