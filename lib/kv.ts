// Funciones compartidas para hablar con la base de datos (Upstash Redis) y comprobar
// la contraseña del admin. Las usan todas las rutas de /api, para no repetir el mismo
// código en cada sitio.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

function dbConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('DB_NOT_CONFIGURED')
  return { url, token }
}

export async function redis(command: string[]) {
  const { url, token } = dbConfig()
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.result
}

export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await redis(['GET', key])
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export async function writeJSON<T>(key: string, value: T) {
  await redis(['SET', key, JSON.stringify(value)])
}

// ---------------------------------------------------------------------------
// Guardar cambios sin pisarse entre sí.
// Antes, cada ruta leía la lista, la modificaba y la volvía a guardar. Si dos cambios
// coincidían en el mismo instante, el último borraba el del otro. Con esta función solo
// uno puede modificar una lista a la vez: el otro espera unos instantes su turno.
// ---------------------------------------------------------------------------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function updateJSON<T>(
  key: string,
  fallback: T,
  mutate: (current: T) => T | Promise<T>,
): Promise<T> {
  const lockKey = `${key}:lock`
  const token = randomBytes(8).toString('hex')

  let acquired = false
  for (let i = 0; i < 30 && !acquired; i++) {
    // NX = solo si nadie la tiene; PX 8000 = se libera sola a los 8 s por si algo falla.
    acquired = (await redis(['SET', lockKey, token, 'NX', 'PX', '8000'])) === 'OK'
    if (!acquired) await sleep(100)
  }
  if (!acquired) throw new Error('DB_BUSY')

  try {
    const current = await readJSON<T>(key, fallback)
    const next = await mutate(current)
    await writeJSON(key, next)
    return next
  } finally {
    // Libera el turno solo si sigue siendo nuestro.
    try {
      await redis([
        'EVAL',
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        '1',
        lockKey,
        token,
      ])
    } catch {
      // Si no se pudo liberar, caduca sola a los 8 segundos.
    }
  }
}

// ---------------------------------------------------------------------------
// Contraseña del admin
// ---------------------------------------------------------------------------
const MAX_ADMIN_FAILS = 8 // intentos fallidos permitidos...
const ADMIN_WINDOW_SECONDS = 15 * 60 // ...cada 15 minutos por persona

// Huella (hash) de la IP: así nunca se guarda la IP en claro.
export function clientHash(req: Request): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'desconocida'
  return createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

// Comparación en "tiempo constante": tarda lo mismo acierte o falle, para que nadie
// pueda adivinar la contraseña midiendo tiempos.
function safeEqual(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export type AdminStatus = 'ok' | 'bad' | 'locked' | 'none'

// 'none'   = no se envió contraseña (visitante normal) o el servidor no tiene ADMIN_PASSWORD
// 'ok'     = contraseña correcta
// 'bad'    = contraseña incorrecta (se anota el intento fallido)
// 'locked' = demasiados intentos fallidos: bloqueado durante 15 minutos
export async function adminStatus(req: Request): Promise<AdminStatus> {
  const expected = process.env.ADMIN_PASSWORD
  const provided = req.headers.get('x-admin-password')
  if (!expected || !provided) return 'none'

  const failKey = `dronesur:admin:fail:${clientHash(req)}`
  try {
    const failures = Number(await redis(['GET', failKey])) || 0
    if (failures >= MAX_ADMIN_FAILS) return 'locked'
  } catch {
    // Si la base de datos falla, seguimos solo con la comprobación de contraseña.
  }

  if (safeEqual(provided, expected)) return 'ok'

  try {
    await redis(['SET', failKey, '0', 'EX', String(ADMIN_WINDOW_SECONDS), 'NX'])
    await redis(['INCR', failKey])
  } catch {
    // Ignorado: no debe impedir responder "contraseña incorrecta".
  }
  return 'bad'
}

export async function isAdmin(req: Request) {
  return (await adminStatus(req)) === 'ok'
}

export function adminPasswordConfigured() {
  return !!process.env.ADMIN_PASSWORD
}
