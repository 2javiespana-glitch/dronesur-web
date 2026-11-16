// Cuentas de Cloudinary donde se guardan las fotos, vídeos y música que subes desde el admin.
// No son secretos: es normal que estén en el código (las claves secretas van en Vercel, no aquí).
//
// Puedes tener VARIAS cuentas. Las subidas van a la primera; cuando Cloudinary dice que esa cuenta no
// admite más (créditos o almacenamiento agotados), la subida pasa sola a la siguiente, sin que tengas que
// hacer nada. Los archivos que ya estaban subidos se siguen viendo desde la cuenta donde se subieron.
//
// Para añadir otra cuenta: pon su «cloud name» en `cloudName` (Cloudinary → Settings → arriba a la
// izquierda, o en el Dashboard) y crea en ella un «upload preset» SIN FIRMAR (unsigned) con el mismo nombre
// que pone en `preset`. Mientras `cloudName` esté vacío, esa cuenta se ignora.
export type CloudinaryAccount = {
  cloudName: string
  preset: string
  label?: string // solo para ti: con qué cuenta (de Google, correo...) se entra a esta cuenta. Sale en el admin.
}

export const CLOUDINARY_ACCOUNTS: CloudinaryAccount[] = [
  { cloudName: 'bar5rrho', preset: 'dronesur videos', label: 'jlv20044' },
  { cloudName: 'ylxgfxzg', preset: 'dronesur videos', label: 'dronesur' }, // segunda cuenta
]

// Solo las cuentas que están rellenadas.
export function configuredAccounts(): { account: CloudinaryAccount; index: number }[] {
  return CLOUDINARY_ACCOUNTS.map((account, index) => ({ account, index })).filter((a) => !!a.account.cloudName.trim())
}

// La primera cuenta (la principal).
export const CLOUDINARY_CLOUD_NAME = CLOUDINARY_ACCOUNTS[0].cloudName
export const CLOUDINARY_UPLOAD_PRESET = CLOUDINARY_ACCOUNTS[0].preset

export type UploadResult = {
  url: string
  // 'image', 'video' o 'raw' (archivos como los modelos 3D), tal como lo clasifica Cloudinary.
  resourceType: string
}

// ---------- Qué cuentas están llenas ----------
// Cuando una cuenta rechaza una subida por falta de cupo, se anota en este navegador durante unas horas
// para no volver a intentarla con cada archivo. Pasado ese tiempo se vuelve a probar (por si has liberado
// espacio o ha empezado el mes nuevo de créditos). Si todas están marcadas, se prueban igualmente en orden.
const FULL_KEY = 'dronesur:cloudinary-full'
const FULL_HOURS = 6

function readFull(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(FULL_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
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
  const at = readFull()[cloudName]
  return typeof at === 'number' && Date.now() - at < FULL_HOURS * 3600_000
}

// ---------- Cuenta elegida por ti ----------
// En el admin puedes elegir a qué cuenta subir («Automático» o una concreta). Se recuerda en este navegador.
// Aunque elijas una, si rechaza la subida por estar llena se prueba con las demás (mejor que fallar).
const PREF_KEY = 'dronesur:cloudinary-pref'

export function getUploadPreference(): string {
  try {
    const value = window.localStorage.getItem(PREF_KEY)
    return value && configuredAccounts().some((a) => a.account.cloudName === value) ? value : 'auto'
  } catch {
    return 'auto'
  }
}

export function setUploadPreference(value: string) {
  try {
    if (value === 'auto') window.localStorage.removeItem(PREF_KEY)
    else window.localStorage.setItem(PREF_KEY, value)
  } catch {}
  notifyTarget()
}

// Orden en que se prueban las cuentas: la que hayas elegido (si has elegido) y, después, primero las que no
// están marcadas como llenas.
function uploadOrder() {
  const accounts = configuredAccounts()
  const ordered = [
    ...accounts.filter((a) => !isMarkedFull(a.account.cloudName)),
    ...accounts.filter((a) => isMarkedFull(a.account.cloudName)),
  ]
  const preferred = getUploadPreference()
  const chosen = preferred === 'auto' ? undefined : accounts.find((a) => a.account.cloudName === preferred)
  return chosen ? [chosen, ...ordered.filter((a) => a !== chosen)] : ordered
}

// ---------- Para enseñarlo en el admin ----------
// A qué cuenta irá ahora la siguiente subida («Cloudinary 1», «Cloudinary 2»...).
export type UploadTarget = {
  number: number // 1 = primera cuenta, 2 = segunda...
  cloudName: string
  configured: number // cuántas cuentas hay rellenadas
  skippedFull: boolean // true si se está saltando alguna cuenta anterior por estar llena
  manual: boolean // true si la cuenta la has elegido tú (no «Automático»)
}

export function currentUploadTarget(): UploadTarget | null {
  const order = uploadOrder()
  if (order.length === 0) return null
  const first = order[0]
  const manual = getUploadPreference() !== 'auto'
  return {
    number: first.index + 1,
    cloudName: first.account.cloudName,
    configured: order.length,
    skippedFull: !manual && first.index !== Math.min(...order.map((o) => o.index)),
    manual,
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
  if (status === 420 || status === 429 || status === 403) return true
  if (/file size|too large|maximum (file|video|image)|video length|duration|megapixel|resolution|dimension|format|invalid (image|video|file)/i.test(detail)) {
    return false
  }
  return /quota|over (the |its |your )?limit|limit (reached|exceeded)|exceed|credit|storage|usage|plan|disabled|suspended|blocked|untrusted/i.test(detail)
}

// Sube un archivo a UNA cuenta concreta.
function uploadToAccount(
  account: CloudinaryAccount,
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
      )

    xhr.send(formData)
  })
}

// Sube un archivo a Cloudinary y devuelve su dirección https y su tipo.
// "image" para fotos; "auto" para fotos, vídeo y audio; "raw" para modelos 3D (.glb).
// Si la cuenta en uso está llena, lo intenta con la siguiente.
export async function uploadToCloudinaryDetailed(
  file: File,
  endpoint: 'image' | 'auto' | 'raw',
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const accounts = uploadOrder()
  if (accounts.length === 0) throw new Error('No hay ninguna cuenta de Cloudinary configurada.')

  let last: unknown
  let allFull = true
  for (let i = 0; i < accounts.length; i++) {
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
