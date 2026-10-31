'use client'

import { useEffect, useState } from 'react'

// Panel del admin para ajustar cuántas reseñas puede enviar el público.
// Habla con /api/reviews (acciones getLimits y setLimits), que solo responde con la contraseña de admin.

type Limits = { max: number; period: 'hour' | 'day'; scope: 'ip' | 'global' }

const DEFAULT_LIMITS: Limits = { max: 3, period: 'day', scope: 'ip' }

function describe(l: Limits) {
  if (l.max <= 0) return 'Ahora mismo: sin límite. Cualquiera puede enviar todas las reseñas que quiera.'
  const plural = l.max === 1 ? 'reseña' : 'reseñas'
  const period = l.period === 'hour' ? 'por hora' : 'por día'
  return l.scope === 'ip'
    ? `Ahora mismo: cada conexión (IP) puede enviar hasta ${l.max} ${plural} ${period}.`
    : `Ahora mismo: entre todos los visitantes se aceptan hasta ${l.max} ${plural} ${period}.`
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-lg bg-[var(--gold)] px-3.5 py-2 text-sm font-semibold text-[var(--gold-foreground)]'
          : 'rounded-lg border border-border px-3.5 py-2 text-sm font-semibold transition hover:bg-muted'
      }
    >
      {children}
    </button>
  )
}

export function ReviewLimitsPanel({ password }: { password: string }) {
  const [saved, setSaved] = useState<Limits>(DEFAULT_LIMITS)
  const [maxText, setMaxText] = useState(String(DEFAULT_LIMITS.max))
  const [period, setPeriod] = useState<Limits['period']>(DEFAULT_LIMITS.period)
  const [scope, setScope] = useState<Limits['scope']>(DEFAULT_LIMITS.scope)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const headers = { 'Content-Type': 'application/json', 'x-admin-password': password }

  useEffect(() => {
    let cancelled = false
    fetch('/api/reviews', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'getLimits' }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.limits) return
        const l: Limits = data.limits
        setSaved(l)
        setMaxText(String(l.max))
        setPeriod(l.period)
        setScope(l.scope)
      })
      .catch(() => {
        // Si falla, se quedan los valores por defecto.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password])

  const save = async () => {
    setMessage(null)
    const max = Math.round(Number(maxText))
    if (maxText.trim() === '' || !Number.isFinite(max) || max < 0 || max > 1000) {
      setMessage({ ok: false, text: 'Pon un número entre 0 y 1000 (0 = sin límite).' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'setLimits', limits: { max, period, scope } }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ ok: false, text: data?.error || 'No se pudo guardar. Inténtalo de nuevo.' })
        return
      }
      setSaved(data.limits)
      setMaxText(String(data.limits.max))
      setMessage({ ok: true, text: 'Guardado.' })
    } catch {
      setMessage({ ok: false, text: 'No se pudo guardar. Revisa tu conexión.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold">Límite de reseñas del público</h2>
      <p className="text-sm text-muted-foreground">
        Controla cuántas opiniones puede enviar la gente desde la web. Las del admin no tienen límite.
      </p>

      <div className="mt-4 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-medium">{loading ? 'Cargando...' : describe(saved)}</p>

        <div className="mt-5">
          <label htmlFor="review-limit-max" className="mb-1.5 block text-sm font-medium">
            Número máximo de reseñas
          </label>
          <input
            id="review-limit-max"
            type="number"
            min={0}
            max={1000}
            inputMode="numeric"
            value={maxText}
            onChange={(e) => setMaxText(e.target.value)}
            className="w-32 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
          />
          <span className="ml-3 text-xs text-muted-foreground">0 = sin límite</span>
        </div>

        <div className="mt-5">
          <p className="mb-1.5 text-sm font-medium">¿A quién se le cuenta?</p>
          <div className="flex flex-wrap gap-2">
            <Choice active={scope === 'ip'} onClick={() => setScope('ip')}>
              A cada conexión (IP)
            </Choice>
            <Choice active={scope === 'global'} onClick={() => setScope('global')}>
              Total entre todos
            </Choice>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-1.5 text-sm font-medium">¿Cada cuánto se reinicia?</p>
          <div className="flex flex-wrap gap-2">
            <Choice active={period === 'hour'} onClick={() => setPeriod('hour')}>
              Por hora
            </Choice>
            <Choice active={period === 'day'} onClick={() => setPeriod('day')}>
              Por día
            </Choice>
          </div>
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          Consejo: si pones un cartel en un sitio donde todos se conectan a la misma red (una
          universidad, por ejemplo), todos comparten la misma IP. En ese caso sube el número con
          «A cada conexión», o elige «Total entre todos» para limitar el total del día.
        </p>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)] disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar límite'}
          </button>
          {message && (
            <span className={message.ok ? 'text-sm text-muted-foreground' : 'text-sm text-destructive'}>
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
