// Cuentas de Cloudinary donde se guardan las fotos, vídeos y música que subes desde el admin.
// No son secretos: es normal que estén en el código (las claves secretas van en Vercel, no aquí).
//
// Puedes tener VARIAS cuentas. Las subidas van a la primera; cuando Cloudinary dice que esa cuenta no
// admite más (créditos o almacenamiento agotados), la subida pasa sola a la siguiente, sin que tengas que
// hacer nada. Los archivos que ya estaban subidos se siguen viendo desde la cuenta donde se subieron.
//
// Para añadir otra cuenta: pon su «cloud name» en `cloudName` (Cloudinary → Settings → arriba a la
// izquierda, o en el Dashboard) y crea en ella un «upload preset» SIN FIRMAR (unsigned) con el mismo nombre
// que p
export type UploadResult = {
  u
}

function markFull(cloudName: string) {
  try {
    const all = readFull()
    all[cloudName] = Date.now()
    window.localStorage.setItem(FULL_KEY, JSON.stringify(all))
  } catch {}
  notifyTarget()
}

function isMarkedFull(cloudName: string): boolean {
  const rlo en el admin ----------
// A qué cuenta irá ahora la siguiente subida («Cloudinary 1», «Cloudinary 2»...).
export type UploadTarget = {
  number: number // 1 = primera cuenta, 2 = segunda...
  cloudName: s

export function currentUploadTarget(): UploadTarget | null {
  const order = uploadOrder()
  if (order.length === 0) return null
  const first = order[0]
  return {,
    cloudName: first.account.cloudName,
    configured: order.length,
    skippedFull: first.index !== Math.min(...order.map((o) => o.index)),
  }
}

const targetListeners = new Set<() => void>()
function notifyTarget() {
  targetListeners.forEach((fn) => fn())
}
// Para que el texto del admin se actualice solo cuando una cuenta pasa a estar llena.
export function subscribeUploadTarget(fn: () => void): () => void {
  targetListeners.add(fn)
  return () => {
    targetListeners.delete(fn)
  }
}

// ---------- Errores ----------
class UploadError extends Error {
  // true si el motivo es que la cuenta no admite más (y por tanto vale la pena probar con otra).
  accountFull: boolean
  constructor(message: string, accountFull: boolean) {
    super(message)
    this.accountFull = accountFull
  }
}

// Decide si Cloudinary rechazó la subida porque la CUENTA está llena o bloqueada, y no por un problema del
// archivo (demasiado grande, formato raro...), que fallaría igual en otra cuenta.
function looksLikeAccountFull(status: number, detail: string): boolean {
  if (status === 420 || status =
  file: File,
  endpoint: 'image' | 'auto' | 'raw',
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', account.preset)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${account.cloudName}/${endpoint}/upload`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve({ url: response.secure_url, resourceType: String(response.resource_type ?? '') })
        } catch {
          reject(new UploadError('Respuesta inesperada de Cloudinary.', false))
        }
      } else {
        let detail = ''
        try {
          detail = JSON.parse(xhr.responseText)?.error?.message ?? ''
        } catch {}
        reject(
          new UploadError(`No se pudo subir "${file.name}". ${detail}`.trim(), looksLikeAccountFull(xhr.status, detail)),
        )
      }
    }

    xhr.onerror = () =>
      reject(
        new UploadError('Error de conexión al subir el archivo. Comprueba tu internet e inténtalo de nuevo.', false),
      )ength; i++) {
    try {
      onProgress?.(0)
      return await uploadToAccount(accounts[i].account, file, endpoint, onProgress)
    } catch (e) {
      last = e
      if (e instanceof UploadError && e.accountFull) {
        markFull(accounts[i].account.cloudName)
        continue // probar con la siguiente cuenta
      }
      allFull = false
      throw e // un fallo que no es de cupo (archivo, conexión...) no se arregla cambiando de cuenta
    }
  }
  if (allFull && accounts.length > 1) {
    throw new Error(
      `No se pudo subir "${file.name}": todas las cuentas de Cloudinary están llenas (sin créditos o sin espacio).`,
    )
  }
  throw last instanceof Error ? last : new Error(`No se pudo subir "${file.name}".`)
}

// Versión corta: solo devuelve la dirección del archivo subido.
export async function uploadToCloudinary(
  file: File,
  endpoint: 'image' | 'auto',
  onProgress?: (percent: number) => void,
): Promise<string> {
  return (await uploadToCloudinaryDetailed(file, endpoint, onProgress)).url
}
