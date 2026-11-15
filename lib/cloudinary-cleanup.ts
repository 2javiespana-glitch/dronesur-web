import { createHash } from 'node:crypto'
import { after } from 'next/server'
import { CLOUDINARY_CLOUD_NAME } from '@/lib/cloudinary'
import { redis } from '@/lib/kv'

// Borra de Cloudinary los archivos que ya no usa la web.
//
// Cuando quitas una foto, un vídeo, una portada o un álbum desde el admin, la web solo apuntaba a Cloudinary:
// el archivo seguía ahí ocupando espacio y créditos. Esto lo elimina también de Cloudinary.
//
// Es una operación SIN VUELTA ATRÁS, así que va con todas las precauciones:
//   · Solo borra archivos de TU cuenta de Cloudinary (nunca una dirección cualquiera).
//   · Antes de borrar comprueba que ese archivo no se usa en ningún otro sitio de la web (otra foto, la foto de
//     «Sobre Dronesur», la del piloto, la música...). Si se usa, NO se toca.
//   · Si no se puede comprobar (la base de datos no responde, por ejemplo), NO se borra nada.
//   · Si falla algo, se ignora: quitar la foto de la web nunca se bloquea por esto.
//   · Hace falta la clave secreta de Cloudinary en Vercel (CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET). Sin ellas
//     no hace nada y todo sigue funcionando como antes.

// Sitios de la base de datos donde la web guarda direcciones de archivos de Cloudinary.
const KEYS_WITH_FILES = ['dronesur:media', 'dronesur:content', 'dronesur:categories', 'dronesur:settings']

export type CloudinaryAsset = { resourceType: 'image' | 'video' | 'raw'; publicId: string }

// Dirección típica: https://res.cloudinary.com/<cuenta>/<tipo>/upload/[transformaciones/][v123/]<nombre>.<extensión>
// Devuelve el tipo y el identificador del archivo, o null si no es un archivo de TU cuenta.
export function parseCloudinaryUrl(url: string): CloudinaryAsset | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' || u.hostname !== 'res.cloudinary.com') return null
  const parts = u.pathname.split('/').filter(Boolean) // [cuenta, tipo, 'upload', ...resto]
  if (parts[0] !== CLOUDINARY_CLOUD_NAME) return null // solo tu cuenta
  const type = parts[1]
  if (type !== 'image' && type !== 'video' && type !== 'raw') return null
  if (parts[2] !== 'upload') return null // nada de archivos privados, remotos ('fetch') ni autenticados

  let rest = parts.slice(3)
  // Transformaciones delante (por ejemplo «vc_h264,q_auto» o «c_limit,w_900»): no forman parte del nombre.
  while (rest.length > 1 && !/^v\d+$/.test(rest[0]) && /^[a-z]{1,3}_[^/,]+(,[a-z]{1,3}_[^/,]+)*$/.test(rest[0])) {
    rest = rest.slice(1)
  }
  if (rest.length > 0 && /^v\d+$/.test(rest[0])) rest = rest.slice(1) // versión («v1699999999»)
  if (rest.length === 0) return null

  let publicId: string
  try {
    publicId = decodeURIComponent(rest.join('/'))
  } catch {
    return null
  }
  // En fotos y vídeos el identificador va sin la extensión; en archivos «raw» (modelos 3D) la lleva.
  if (type !== 'raw') publicId = publicId.replace(/\.[A-Za-z0-9]+$/, '')
  return publicId ? { resourceType: type, publicId } : null
}

const assetKey = (a: CloudinaryAsset) => `${a.resourceType}:${a.publicId}`

// Firma que pide Cloudinary: los parámetros ordenados, unidos con «&», más la clave secreta, en SHA-1.
export function signParams(params: Record<string, string>, secret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return createHash('sha1').update(toSign + secret).digest('hex')
}

// Todos los archivos de Cloudinary que la web sigue usando ahora mismo. Devuelve null si no se pudo
// comprobar (entonces no se borra nada). Se lee el texto en bruto, sin interpretarlo, para no depender de
// qué campo guarda cada dirección (así tampoco se pierde nada si algún día se añaden campos nuevos).
async function stillUsed(): Promise<Set<string> | null> {
  const used = new Set<string>()
  try {
    for (const key of KEYS_WITH_FILES) {
      const raw = await redis(['GET', key])
      if (raw == null) continue // esa lista aún no existe: no hay nada guardado
      if (typeof raw !== 'string') return null
      for (const match of raw.matchAll(/https:\/\/res\.cloudinary\.com\/[^"\s\\]+/g)) {
        const asset = parseCloudinaryUrl(match[0])
        if (asset) used.add(assetKey(asset))
      }
    }
  } catch {
    return null
  }
  return used
}

type DestroyResult = 'ok' | 'not_found' | 'failed'

async function destroyAsset(asset: CloudinaryAsset, apiKey: string, apiSecret: string): Promise<DestroyResult> {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signed = { invalidate: 'true', public_id: asset.publicId, timestamp }
  const body = new URLSearchParams({ ...signed, api_key: apiKey, signature: signParams(signed, apiSecret) })
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${asset.resourceType}/destroy`, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(15_000),
    })
    const data = (await res.json().catch(() => ({}))) as { result?: string }
    if (data.result === 'ok') return 'ok'
    if (data.result === 'not found') return 'not_found' // ya no estaba: es lo que queríamos
    return 'failed'
  } catch {
    return 'failed'
  }
}

// Llama a esto DESPUÉS de haber quitado los archivos de la lista de la web. Recibe las direcciones que se acaban de
// quitar y borra de Cloudinary las que ya no usa nadie. No lanza errores.
export async function releaseCloudinaryAssets(urls: string[]): Promise<void> {
  try {
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    if (!apiKey || !apiSecret) return // sin la clave secreta, esta función está apagada

    // Solo archivos de tu cuenta y sin repetir.
    const candidates = new Map<string, CloudinaryAsset>()
    for (const url of urls) {
      const asset = url ? parseCloudinaryUrl(url) : null
      if (asset) candidates.set(assetKey(asset), asset)
    }
    if (candidates.size === 0) return

    const used = await stillUsed()
    if (!used) {
      console.warn('[cloudinary-cleanup] No se pudo comprobar qué archivos se usan: no se ha borrado nada.')
      return
    }

    const toDelete = [...candidates.entries()].filter(([key]) => !used.has(key)).map(([, asset]) => asset)
    const kept = candidates.size - toDelete.length
    if (kept > 0) console.info(`[cloudinary-cleanup] ${kept} archivo(s) se siguen usando en otro sitio: no se borran.`)

    // De 4 en 4, para no saturar a Cloudinary con un álbum grande.
    for (let i = 0; i < toDelete.length; i += 4) {
      const results = await Promise.all(toDelete.slice(i, i + 4).map((a) => destroyAsset(a, apiKey, apiSecret)))
      results.forEach((result, n) => {
        if (result === 'failed') console.error(`[cloudinary-cleanup] No se pudo borrar ${toDelete[i + n].publicId}`)
      })
    }
  } catch (e) {
    console.error('[cloudinary-cleanup] Error inesperado (se ignora):', e)
  }
}

// Lo que usan las rutas: programa el borrado para DESPUÉS de responder al admin (así no espera ni se retrasa).
export function scheduleCloudinaryRelease(urls: string[]): void {
  if (!urls.some(Boolean)) return
  try {
    after(() => releaseCloudinaryAssets(urls))
  } catch {
    void releaseCloudinaryAssets(urls) // si no se puede programar, se lanza igualmente
  }
}
