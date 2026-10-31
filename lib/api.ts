import { NextResponse } from 'next/server'
import { adminPasswordConfigured, adminStatus } from '@/lib/kv'

// Ayudas compartidas por todas las rutas de /api (antes cada ruta tenía su propia copia).

export function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export function serverError(e: unknown) {
  if (e instanceof Error && e.message === 'DB_NOT_CONFIGURED') {
    return fail('Falta conectar la base de datos (Upstash) en Vercel.', 500)
  }
  if (e instanceof Error && e.message === 'DB_BUSY') {
    return fail('El servidor está ocupado. Inténtalo de nuevo en unos segundos.', 503)
  }
  return fail('Error en el servidor al guardar los datos.', 500)
}

// Devuelve null si quien llama es el admin; si no, devuelve la respuesta de error que
// hay que enviar (contraseña mal, bloqueado por demasiados intentos, falta configurar...).
export async function requireAdmin(req: Request): Promise<NextResponse | null> {
  if (!adminPasswordConfigured()) {
    return fail('Falta configurar ADMIN_PASSWORD en Vercel (Settings > Environment Variables).', 500)
  }
  const status = await adminStatus(req)
  if (status === 'ok') return null
  if (status === 'locked') {
    return fail('Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.', 429)
  }
  return fail('Contraseña incorrecta', 401)
}
