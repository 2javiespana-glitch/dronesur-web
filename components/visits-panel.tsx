'use client'

import { useCallback, useEffect, useState } from 'react'

// Panel del admin: visitas a la web por provincia y últimas visitas.
// Habla con /api/visits, que solo responde con la contraseña de admin.

type Visit = { t: number; province: string; city: string; device: string; path: string; from: string; ref?: string }
type Data = {
  total: number
  totals: { province: string; visits: number }[]
  refs?: { ref: string; visits: number }[]
  byDay: { date: string; total: number }[]
  recent: Visit[]
}

const primaryButton =
  'inline-flex items-center justify-center rounded-lg bg-[var(--gold)] px-3.5 py-1.5 text-xs font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)] disabled:opacity-60'
const secondaryButton =
  'inline-flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-60'

const RANGES = [7, 30, 90]

function formatTime(ts: number) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Madrid',
  }).format(new Date(ts))
}

export function VisitsPanel({ password }: { password: string }) {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/visits?days=${days}`, {
        cache: 'no-store',
        headers: { 'x-admin-password': password },
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'No se pudieron cargar las visitas.')
      setData(json as Data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las visitas.')
    } finally {
      setLoading(false)
    }
  }, [days, password])

  useEffect(() => {
    void load()
  }, [load])

  const max = data?.totals[0]?.visits || 1
  const refMax = data?.refs?.[0]?.visits || 1

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setDays(r)}
            className={days === r ? primaryButton : secondaryButton}
          >
            Últimos {r} días
          </button>
        ))}
        <button type="button" onClick={() => void load()} disabled={loading} className={secondaryButton}>
          Actualizar
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-base font-bold">Visitas por provincia</h3>
          <span className="text-sm text-muted-foreground">
            {loading ? 'Cargando...' : `${data?.total ?? 0} visitas`}
          </span>
        </div>

        {!loading && data && data.totals.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">Todavía no hay visitas registradas en este periodo.</p>
        )}

        <ul className="mt-4 space-y-2">
          {data?.totals.map((row) => (
            <li key={row.province} className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{row.province}</span>
                <span className="tabular-nums text-muted-foreground">{row.visits}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[var(--gold)]"
                  style={{ width: `${Math.max(3, Math.round((row.visits / max) * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-base font-bold">Visitas por cartel o enlace</h3>
          <span className="text-sm text-muted-foreground">
            {loading ? 'Cargando...' : `${data?.refs?.reduce((s, r) => s + r.visits, 0) ?? 0} visitas`}
          </span>
        </div>

        {!loading && (!data?.refs || data.refs.length === 0) && (
          <p className="mt-4 text-sm text-muted-foreground">
            Aquí verás qué cartel, tarjeta o QR te trae visitas. Pon en cada uno un enlace con su nombre, por ejemplo{' '}
            <span className="font-mono text-foreground">dronesur.es/?ref=cartel-1</span>. Todavía no ha entrado nadie por
            uno de ellos en este periodo.
          </p>
        )}

        <ul className="mt-4 space-y-2">
          {data?.refs?.map((row) => (
            <li key={row.ref} className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono font-medium">{row.ref}</span>
                <span className="tabular-nums text-muted-foreground">{row.visits}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[var(--gold)]"
                  style={{ width: `${Math.max(3, Math.round((row.visits / refMax) * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-base font-bold">Últimas visitas</h3>
        {!loading && data && data.recent.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">Sin visitas recientes.</p>
        )}
        <ul className="mt-4 divide-y divide-border">
          {data?.recent.map((v, i) => (
            <li key={`${v.t}-${i}`} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-sm">
              <span className="font-medium">
                {v.province}
                {v.city ? <span className="font-normal text-muted-foreground"> · {v.city}</span> : null}
              </span>
              <span className="text-xs text-muted-foreground">
                {v.device}
                {v.ref ? ` · ref ${v.ref}` : ''}
                {v.from ? ` · desde ${v.from}` : ''}
                {v.path && v.path !== '/' ? ` · ${v.path}` : ''} · {formatTime(v.t)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        Solo cuenta a quien ha aceptado las cookies de estadísticas, así que son más visitas de las que aquí salen. La
        provincia se deduce de la IP y es orientativa: en móvil a veces sale otra provincia. Una misma persona cuenta
        una vez cada 30 minutos. No se guarda ninguna IP ni se puede saber quién es cada visita.
      </p>
    </div>
  )
}
