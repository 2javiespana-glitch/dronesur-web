'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  configuredAccounts,
  currentUploadTarget,
  getUploadPreference,
  setUploadPreference,
  subscribeUploadTarget,
  type UploadTarget,
} from '@/lib/cloudinary'
import type { AccountUsage } from '@/lib/cloudinary-usage'

// Pequeño texto del admin que dice a qué cuenta de Cloudinary van las subidas («Cloudinary 1», «Cloudinary 2»).
// Se actualiza solo cuando una cuenta se llena y las subidas pasan a la siguiente.
export function useUploadTarget(): UploadTarget | null {
  const [target, setTarget] = useState<UploadTarget | null>(null)
  useEffect(() => {
    const update = () => setTarget(currentUploadTarget())
    update()
    return subscribeUploadTarget(update)
  }, [])
  return target
}

// Línea informativa para la parte de arriba del panel de archivos.
export function CloudinaryTarget() {
  const target = useUploadTarget()
  if (!target) return null
  return (
    <p className="text-xs text-muted-foreground">
      {target.ask ? (
        <>Al subir vídeos, eliges la cuenta de Cloudinary de cada uno</>
      ) : (
        <>
          Las subidas van a: <span className="font-semibold text-foreground">Cloudinary {target.number}</span>
          {target.manual && <> (elegida por ti)</>}
          {target.skippedFull && <> (la anterior está llena)</>}
          {target.configured < 2 && <> · la 2ª cuenta aún no está configurada</>}
        </>
      )}
    </p>
  )
}

// Cuadro del admin con los créditos gastados de cada cuenta de Cloudinary y el selector de a cuál subir.
// Los créditos los da Cloudinary (se actualizan solos cada minuto mientras tienes el admin abierto), así que pueden ir
// algo por detrás de la realidad. Necesita las claves de cada cuenta en Vercel; sin ellas, esa cuenta no muestra el %.
export function CloudinaryAccounts({ password }: { password: string }) {
  const target = useUploadTarget() // también sirve para que se redibuje al cambiar la elección
  const [usage, setUsage] = useState<AccountUsage[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cloudinary-usage', { cache: 'no-store', headers: { 'x-admin-password': password } })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'No se pudieron consultar los créditos.')
      setUsage(json.accounts as AccountUsage[])
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron consultar los créditos.')
    } finally {
      setLoading(false)
    }
  }, [password])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => {
      if (!document.hidden) void load()
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [load])

  const accounts = configuredAccounts()
  if (accounts.length === 0) return null
  const preference = typeof window === 'undefined' ? 'auto' : getUploadPreference()
  const options = [
    { value: 'auto', label: 'Automático' },
    ...accounts.map((a) => ({ value: a.account.cloudName, label: `Cloudinary ${a.index + 1}` })),
    // Con una sola cuenta no hay nada que elegir.
    ...(accounts.length > 1 ? [{ value: 'ask', label: 'Elegir en cada vídeo' }] : []),
  ]

  return (
    <div className="mt-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold">Subir a:</span>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setUploadPreference(o.value)}
              className={`rounded-full px-3 py-1 font-semibold transition ${
                preference === o.value
                  ? 'bg-[var(--gold)] text-[var(--gold-foreground)]'
                  : 'border border-border hover:bg-muted'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      <ul className="mt-3 space-y-2.5">
        {accounts.map((a) => {
          const u = usage?.find((x) => x.number === a.index + 1)
          const pct = u?.percent ?? null
          const color = pct === null ? 'bg-muted' : pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-[var(--gold)]'
          return (
            <li key={a.account.cloudName} className="text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <span>
                  <span className="font-semibold">Cloudinary {a.index + 1}</span>{' '}
                  <span className="text-muted-foreground">· {a.account.cloudName}</span>
                  {a.account.label && (
                    <span className="ml-1.5 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Google: {a.account.label}
                    </span>
                  )}
                  {target && !target.ask && target.number === a.index + 1 && (
                    <span className="ml-1.5 rounded-full bg-[var(--gold)]/20 px-1.5 py-0.5 text-[10px] font-semibold">
                      recibe las subidas
                    </span>
                  )}
                </span>
                <span className="font-semibold tabular-nums">
                  {pct !== null ? `${pct}% de créditos` : usage ? '—' : 'Cargando…'}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
              </div>
              {u?.message && <p className="mt-1 text-muted-foreground">{u.message}</p>}
            </li>
          )
        })}
      </ul>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Si eliges una cuenta y está llena, la subida pasa sola a la otra. Con «Elegir en cada vídeo», al soltar vídeos te
        sale una ventana para decidir a qué cuenta va cada uno (las fotos siguen la opción «Automático»). Los créditos los
        calcula Cloudinary y pueden ir un poco por detrás.
      </p>
    </div>
  )
}

// Selector pequeño junto al botón «Añadir» de cada carpeta, álbum y carrusel: elige a qué cuenta de Cloudinary se
// suben los archivos («Automático», una cuenta concreta, o «Elegir en cada vídeo» para decidirlo al soltarlos).
// Es la misma elección que la del cuadro de créditos de la cuadrícula de categorías: si la cambias aquí, cambia allí.
export function UploadAccountSwitch() {
  const target = useUploadTarget() // para que se redibuje cuando cambia la elección o una cuenta se llena
  const accounts = configuredAccounts()
  if (accounts.length < 2) return null
  const preference = target ? (target.ask ? 'ask' : target.manual ? target.cloudName : 'auto') : getUploadPreference()
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="font-semibold">Subir a</span>
      <select
        value={preference}
        onChange={(e) => setUploadPreference(e.target.value)}
        aria-label="Cuenta de Cloudinary a la que se suben los archivos"
        className="rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground outline-none focus:border-[var(--gold)]"
      >
        <option value="auto">Automático{target && !target.manual && !target.ask ? ` (Cloudinary ${target.number})` : ''}</option>
        {accounts.map((a) => (
          <option key={a.account.cloudName} value={a.account.cloudName}>
            Cloudinary {a.index + 1}
            {a.account.label ? ` · ${a.account.label}` : ''}
          </option>
        ))}
        <option value="ask">Elegir en cada vídeo</option>
      </select>
    </label>
  )
}
