'use client'

import { useEffect, useState } from 'react'

// Gráficos de «a qué hora» y «qué día y hora» llegan las visitas (hora de Madrid). Los usan el panel de visitas
// (kind="web") y el de carteles (kind="links"). Los datos salen de /api/hourly, que solo responde con la contraseña de admin.

type HourlyDay = { date: string; hours: number[]; total: number }
type Hourly = {
  total: number
  byHour: number[]
  byDay: HourlyDay[]
  peakHour: { hour: number; count: number } | null
  peakDay: { date: string; count: number } | null
}
type Response = { visits?: Hourly; openings?: Hourly }

const HEATMAP_DAYS = 14 // filas del mapa de calor (los días más recientes del periodo)
const two = (n: number) => String(n).padStart(2, '0')

// «2026-11-17» → «mar 17/11» (se interpreta como fecha pura, sin zona horaria).
function dayLabel(date: string) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(
    new Date(`${date}T12:00:00Z`),
  )
}

function Block({ title, unit, data }: { title: string; unit: string; data: Hourly | undefined }) {
  if (!data) return null
  const barMax = Math.max(1, ...data.byHour)
  const rows = data.byDay.slice(0, HEATMAP_DAYS)
  const cellMax = Math.max(1, ...rows.flatMap((d) => d.hours))
  const peak = data.peakHour ? `${two(data.peakHour.hour)}:00–${two(data.peakHour.hour)}:59` : ''

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-bold">{title}</h3>
        <span className="text-sm text-muted-foreground">
          {data.total} {unit}
        </span>
      </div>

      {data.total === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Todavía no hay datos con hora en este periodo. La hora se empieza a apuntar desde que se activó esta función, así
          que lo anterior solo tiene el día.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm">
            <span className="text-muted-foreground">Hora con más {unit}: </span>
            <span className="font-semibold">{peak}</span>
            <span className="text-muted-foreground"> ({data.peakHour?.count})</span>
            {data.peakDay && (
              <>
                <span className="text-muted-foreground"> · Día con más: </span>
                <span className="font-semibold">{dayLabel(data.peakDay.date)}</span>
                <span className="text-muted-foreground"> ({data.peakDay.count})</span>
              </>
            )}
          </p>

          <p className="mt-4 text-xs font-medium text-muted-foreground">A qué hora (suma de todo el periodo)</p>
          <div className="mt-2 flex h-28 items-end gap-[3px]">
            {data.byHour.map((n, h) => (
              <div
                key={h}
                className="flex h-full flex-1 flex-col justify-end"
                title={`${two(h)}:00–${two(h)}:59 · ${n} ${unit}`}
              >
                <div
                  className="w-full rounded-t bg-[var(--gold)]"
                  style={{ height: n > 0 ? `${Math.max(4, Math.round((n / barMax) * 100))}%` : '2px', opacity: n > 0 ? 1 : 0.25 }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground" aria-hidden="true">
            <span>0h</span>
            <span>6h</span>
            <span>12h</span>
            <span>18h</span>
            <span>23h</span>
          </div>

          <p className="mt-5 text-xs font-medium text-muted-foreground">
            Día y hora (últimos {rows.length} {rows.length === 1 ? 'día' : 'días'})
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="border-separate border-spacing-[2px] text-[10px] tabular-nums">
              <caption className="sr-only">{title}: número de {unit} por día y hora</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 bg-card pr-2 text-left font-medium text-muted-foreground">
                    Día
                  </th>
                  {Array.from({ length: 24 }, (_, h) => (
                    <th key={h} scope="col" className="min-w-[22px] text-center font-normal text-muted-foreground">
                      {two(h)}
                    </th>
                  ))}
                  <th scope="col" className="pl-2 text-right font-medium text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.date}>
                    <th scope="row" className="sticky left-0 whitespace-nowrap bg-card pr-2 text-left font-medium">
                      {dayLabel(d.date)}
                    </th>
                    {d.hours.map((n, h) => (
                      <td
                        key={h}
                        title={`${dayLabel(d.date)} ${two(h)}:00–${two(h)}:59 · ${n} ${unit}`}
                        className="h-[22px] rounded-sm text-center"
                        style={{
                          backgroundColor:
                            n > 0
                              ? `color-mix(in srgb, var(--gold) ${Math.round(20 + (n / cellMax) * 80)}%, transparent)`
                              : 'var(--muted)',
                        }}
                      >
                        {n > 0 ? n : ''}
                      </td>
                    ))}
                    <td className="pl-2 text-right font-semibold">{d.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Cada casilla es una hora (por ejemplo, «18» = de 18:00 a 18:59, hora de Madrid). Cuanto más oscura, más {unit}.
          </p>
        </>
      )}
    </div>
  )
}

export function HourlyStats({
  password,
  kind,
  days,
  slug,
  reloadKey = 0,
}: {
  password: string
  kind: 'web' | 'links'
  days: number
  slug?: string
  reloadKey?: number
}) {
  const [data, setData] = useState<Response | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const query = new URLSearchParams({ kind, days: String(days) })
        if (slug) query.set('slug', slug)
        const res = await fetch(`/api/hourly?${query}`, { cache: 'no-store', headers: { 'x-admin-password': password } })
        const json = await res.json().catch(() => null)
        if (!res.ok) throw new Error(json?.error || 'No se pudieron cargar las horas.')
        if (!cancelled) setData(json as Response)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'No se pudieron cargar las horas.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [password, kind, days, slug, reloadKey])

  if (error) return <p className="mt-4 text-sm text-destructive">{error}</p>
  if (loading && !data) return <p className="mt-4 text-sm text-muted-foreground">Cargando horas...</p>

  return (
    <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
      {kind === 'web' ? (
        <Block title="Visitas a la web por hora" unit="visitas" data={data?.visits} />
      ) : (
        <>
          <Block title="Aperturas por día y hora" unit="aperturas" data={data?.openings} />
          <Block title="Visitas a la web que llegan desde carteles" unit="visitas" data={data?.visits} />
        </>
      )}
    </div>
  )
}
