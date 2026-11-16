// Cuánto llevas gastado de los créditos de cada cuenta de Cloudinary (lo ve el admin, en el gestor de archivos).
// Lo calcula app/api/cloudinary-usage/route.ts con el «Admin API» de Cloudinary (método usage), que necesita las
// claves de cada cuenta en Vercel (las mismas que usa el borrado automático).

export type AccountUsage = {
  number: number // 1 = primera cuenta, 2 = segunda...
  cloudName: string
  status: 'ok' | 'no_keys' | 'error'
  percent: number | null // % de créditos gastados este mes (0 a 100+)
  plan?: string
  lastUpdated?: string // cuándo calculó Cloudinary estos datos
  message?: string // explicación si no hay dato
}

function num(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

// Saca el porcentaje de créditos de la respuesta de Cloudinary. Usa «credits.used_percent»; si no viene,
// lo calcula con «credits.usage» y «credits.limit». Devuelve null si no hay forma de saberlo.
export function parseCloudinaryUsage(json: unknown): Pick<AccountUsage, 'percent' | 'plan' | 'lastUpdated'> {
  const o = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>
  const credits = (o.credits && typeof o.credits === 'object' ? o.credits : {}) as Record<string, unknown>
  let percent = num(credits.used_percent)
  if (percent === null) {
    const usage = num(credits.usage)
    const limit = num(credits.limit)
    if (usage !== null && limit !== null && limit > 0) percent = (usage / limit) * 100
  }
  return {
    percent: percent === null ? null : Math.round(percent * 10) / 10,
    plan: typeof o.plan === 'string' ? o.plan : undefined,
    lastUpdated: typeof o.last_updated === 'string' ? o.last_updated : undefined,
  }
}
