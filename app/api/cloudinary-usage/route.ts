import { NextResponse } from 'next/server'
import { requireAdmin, serverError } from '@/lib/api'
import { configuredAccounts } from '@/lib/cloudinary'
import { credentialsFor } from '@/lib/cloudinary-cleanup'
import { parseCloudinaryUsage, type AccountUsage } from '@/lib/cloudinary-usage'

// Créditos gastados de cada cuenta de Cloudinary, para el admin. Solo con la contraseña de admin.
// Cloudinary limita este servicio a 500 consultas por hora; por eso se guarda la respuesta 30 segundos.

export const dynamic = 'force-dynamic'

let cache: { at: number; accounts: AccountUsage[] } | null = null
const CACHE_MS = 30_000

async function usageOf(index: number, cloudName: string): Promise<AccountUsage> {
  const number = index + 1
  const creds = credentialsFor(index)
  if (!creds) {
    return {
      number,
      cloudName,
      status: 'no_keys',
      percent: null,
      message: 'Faltan sus claves en Vercel para ver los créditos.',
    }
  }
  try {
    const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString('base64')
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/usage`, {
      headers: { Authorization: `Basic ${auth}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) {
      return {
        number,
        cloudName,
        status: 'error',
        percent: null,
        message:
          res.status === 401 || res.status === 403
            ? 'Cloudinary no acepta las claves de esta cuenta. Revísalas en Vercel.'
            : `Cloudinary respondió con un error (${res.status}).`,
      }
    }
    const parsed = parseCloudinaryUsage(await res.json().catch(() => null))
    return {
      number,
      cloudName,
      status: 'ok',
      ...parsed,
      message: parsed.percent === null ? 'Cloudinary no ha dado el porcentaje de créditos.' : undefined,
    }
  } catch {
    return { number, cloudName, status: 'error', percent: null, message: 'No se pudo consultar a Cloudinary.' }
  }
}

export async function GET(req: Request) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  try {
    if (!cache || Date.now() - cache.at > CACHE_MS) {
      const accounts = await Promise.all(configuredAccounts().map((a) => usageOf(a.index, a.account.cloudName)))
      cache = { at: Date.now(), accounts }
    }
    return NextResponse.json({ accounts: cache.accounts }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return serverError(e)
  }
}
