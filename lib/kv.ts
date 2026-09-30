// Funciones compartidas para hablar con la base de datos (Upstash Redis) y comprobar
// la contraseña del admin. Las usan tanto /api/media como /api/albums, para no repetir
// el mismo código en los dos sitios.

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

export function isAdmin(req: Request) {
  const expected = process.env.ADMIN_PASSWORD
  return !!expected && req.headers.get('x-admin-password') === expected
}

export function adminPasswordConfigured() {
  return !!process.env.ADMIN_PASSWORD
}
