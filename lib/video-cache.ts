// Guarda en la memoria del aparato los vídeos del carrusel, para que no haya que volver a pedirlos
// mientras la pestaña siga abierta (al cerrarla, el navegador lo libera todo solo).
//
// Solo se usa con el vídeo ligero del móvil (1280 px). Para no ocupar demasiada memoria:
//  · ningún vídeo se guarda si pesa más de MAX_ONE;
//  · entre todos no se pasa del TOTAL, que depende de la memoria del aparato;
//  · si algo falla (sin conexión, sin permiso, sin sitio...), no pasa nada: el vídeo se ve como siempre.

const MB = 1024 * 1024
const MAX_ONE = 30 * MB // un vídeo ligero de portada suele pesar de 3 a 15 MB

const cache = new Map<string, string>() // dirección del vídeo -> dirección en memoria (blob:)
const sizes = new Map<string, number>()
let used = 0

// Presupuesto total de memoria para los vídeos. deviceMemory (Chrome/Android) da la RAM aproximada en GB;
// Safari/iPhone no lo da, y ahí se usa el valor prudente.
function totalBudget(): number {
  const gb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (typeof gb === 'number' && gb >= 8) return 160 * MB
  if (typeof gb === 'number' && gb >= 4) return 120 * MB
  return 72 * MB
}

// Solo comprueba que el navegador sabe hacerlo. Ya no se mira el «ahorro de datos» del visitante.
function allowed(): boolean {
  return typeof window !== 'undefined' && typeof fetch === 'function' && typeof URL.createObjectURL === 'function'
}

// Dirección en memoria del vídeo, si ya está guardado.
export function cachedVideo(url: string): string | undefined {
  return cache.get(url)
}

// Descarga el vídeo entero a memoria. Devuelve la dirección en memoria, o null si no se ha guardado
// (demasiado pesado, sin presupuesto, error, cancelado...). Nunca lanza errores.
export async function fetchVideoToMemory(url: string, signal: AbortSignal): Promise<string | null> {
  const hit = cache.get(url)
  if (hit) return hit
  if (!allowed()) return null
  try {
    const res = await fetch(url, { signal })
    if (!res.ok || !res.body) return null

    const declared = Number(res.headers.get('content-length')) || 0
    const fits = (n: number) => n <= MAX_ONE && used + n <= totalBudget()
    if (declared && !fits(declared)) {
      void res.body.cancel().catch(() => {})
      return null
    }

    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        size += value.byteLength
        if (!fits(size)) {
          // No avisaba su tamaño y ha resultado demasiado grande: se deja de bajar.
          void reader.cancel().catch(() => {})
          return null
        }
      }
    }
    if (size === 0 || !fits(size)) return null
    // Otra descarga igual pudo terminar mientras tanto.
    const already = cache.get(url)
    if (already) return already

    const blob = new Blob(chunks as BlobPart[], { type: res.headers.get('content-type') || 'video/mp4' })
    const objectUrl = URL.createObjectURL(blob)
    cache.set(url, objectUrl)
    sizes.set(url, blob.size)
    used += blob.size
    return objectUrl
  } catch {
    return null
  }
}

// Quita un vídeo de la memoria (por ejemplo, si el navegador no ha podido reproducirlo desde ahí).
export function forgetVideo(url: string) {
  const objectUrl = cache.get(url)
  if (!objectUrl) return
  URL.revokeObjectURL(objectUrl)
  cache.delete(url)
  used -= sizes.get(url) ?? 0
  sizes.delete(url)
}
