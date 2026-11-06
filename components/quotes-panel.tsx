'use client'

import { useCallback, useEffect, useState } from 'react'
import { type Quote, type QuoteStatus, type QuotesConfig, DEFAULT_QUOTES_CONFIG } from '@/lib/quotes'

// Panel del admin: interruptor para guardar las solicitudes de presupuesto (y recibir el aviso por
// Telegram) y listado de las que han llegado. Habla con /api/quotes, que solo responde con la contraseña de admin.

const primaryButton =
  'inline-flex items-center justify-center rounded-lg bg-[var(--gold)] px-3.5 py-1.5 text-xs font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)] disabled:opacity-60'
const secondaryButton =
  'inline-flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-60'

const STATUS_LABEL: Record<QuoteStatus, string> = {
  new: 'Nueva',
  contacted: 'Contactada',
  closed: 'Cerrada',
}

type Filter = 'new' | 'all'

// Un enlace útil para contestar a la persona: correo, o WhatsApp si dejó un teléfono.
function contactLinks(contact: string): { label: string; href: string }[] {
  const value = contact.trim()
  if (!value) return []
  if (value.includes('@')) return [{ label: 'Escribir correo', href: `mailto:${value}` }]
  const digits = value.replace(/[^\d]/g, '')
  if (digits.length < 9) return []
  // Un número español de 9 cifras sin prefijo se completa con el +34.
  const full = value.startsWith('+') || digits.length > 9 ? digits : `34${digits}`
  return [
    { label: 'Abrir WhatsApp', href: `https://wa.me/${full}` },
    { label: 'Llamar', href: `tel:+${full}` },
  ]
}

function formatDate(ts: number) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Madrid',
  }).format(new Date(ts))
}

export function QuotesPanel({ password }: { password: string }) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [config, setConfig] = useState<QuotesConfig>(DEFAULT_QUOTES_CONFIG)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<Filter>('new')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const headers = { 'Content-Type': 'application/json', 'x-admin-password': password }

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/quotes', { headers: { 'x-admin-password': password }, cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || 'No se pudieron cargar las solicitudes.')
        return
      }
      setQuotes(data.quotes)
      setConfig(data.config)
      setError('')
    } catch {
      setError('No se pudieron cargar las solicitudes. Revisa tu conexión.')
    } finally {
      setLoading(false)
    }
  }, [password])

  useEffect(() => {
    void load()
  }, [load])

  const post = async (body: unknown) => {
    const res = await fetch('/api/quotes', { method: 'POST', headers, body: JSON.stringify(body) })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(data?.error || 'No se pudo guardar. Inténtalo de nuevo.')
    return data
  }

  const toggle = async () => {
    setSaving(true)
    setError('')
    try {
      const data = await post({ action: 'setConfig', config: { enabled: !config.enabled } })
      setConfig(data.config)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  const setStatus = async (id: string, status: QuoteStatus) => {
    setError('')
    try {
      const data = await post({ action: 'status', id, status })
      setQuotes(data.quotes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
    }
  }

  const remove = async (id: string) => {
    setError('')
    try {
      const res = await fetch('/api/quotes', { method: 'DELETE', headers, body: JSON.stringify({ id }) })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar.')
      setQuotes(data.quotes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar.')
    } finally {
      setConfirmDelete(null)
    }
  }

  const newCount = quotes.filter((q) => q.status === 'new').length
  const visible = filter === 'new' ? quotes.filter((q) => q.status === 'new') : quotes

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold">
        Solicitudes de presupuesto
        {newCount > 0 && (
          <span className="ml-2 rounded-full bg-[var(--gold)] px-2.5 py-0.5 align-middle text-xs font-bold text-[var(--gold-foreground)]">
            {newCount} nueva{newCount === 1 ? '' : 's'}
          </span>
        )}
      </h2>
      <p className="text-sm text-muted-foreground">
        Cuando alguien rellena el formulario de presupuesto, se guarda aquí y te llega un aviso por Telegram,
        aunque la persona no llegue a enviar el mensaje por WhatsApp.
      </p>

      {/* Interruptor */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            Guardar solicitudes y avisarme por Telegram:{' '}
            <span className={config.enabled ? 'text-gold' : 'text-muted-foreground'}>
              {loading ? '…' : config.enabled ? 'ACTIVADO' : 'DESACTIVADO'}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {config.enabled
              ? 'Cada solicitud se guarda y te avisa. Desactívalo si esperas muchas visitas por curiosidad (por ejemplo, un cartel en la universidad).'
              : 'Desactivado: el formulario sigue abriendo WhatsApp o el correo como siempre, pero no se guarda nada ni recibes avisos.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={config.enabled}
          aria-label="Guardar solicitudes y avisar por Telegram"
          onClick={() => void toggle()}
          disabled={saving || loading}
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${
            config.enabled ? 'bg-[var(--gold)]' : 'bg-muted'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
              config.enabled ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {/* Filtro */}
      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('new')}
          className={filter === 'new' ? primaryButton : secondaryButton}
        >
          Nuevas ({newCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? primaryButton : secondaryButton}
        >
          Todas ({quotes.length})
        </button>
      </div>

      {/* Lista */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {filter === 'new' ? 'No hay solicitudes nuevas.' : 'Todavía no ha llegado ninguna solicitud.'}
          </div>
        ) : (
          visible.map((q) => {
            const links = contactLinks(q.contact)
            return (
              <div key={q.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(q.createdAt)} · {q.channel === 'email' ? 'Correo' : 'WhatsApp'} ·{' '}
                    {q.lang.toUpperCase()}
                  </p>
                  <span
                    className={
                      q.status === 'new'
                        ? 'rounded-full bg-[var(--gold)] px-2.5 py-0.5 text-xs font-bold text-[var(--gold-foreground)]'
                        : 'rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground'
                    }
                  >
                    {STATUS_LABEL[q.status]}
                  </span>
                </div>

                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-muted-foreground">Servicio</dt>
                    <dd className="font-medium">{q.service || '—'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-muted-foreground">Zona</dt>
                    <dd className="font-medium">{q.location || '—'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-muted-foreground">Detalles</dt>
                    <dd className="whitespace-pre-line">{q.details || '—'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-muted-foreground">Contacto</dt>
                    <dd className="font-medium">{q.contact || 'No ha dejado ninguno'}</dd>
                  </div>
                  {q.discount && (
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-muted-foreground">Descuento</dt>
                      <dd>Pide el descuento de bienvenida</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {links.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      target={l.href.startsWith('http') ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className={primaryButton}
                    >
                      {l.label}
                    </a>
                  ))}
                  {q.status !== 'contacted' && (
                    <button type="button" onClick={() => void setStatus(q.id, 'contacted')} className={secondaryButton}>
                      Marcar contactada
                    </button>
                  )}
                  {q.status !== 'closed' && (
                    <button type="button" onClick={() => void setStatus(q.id, 'closed')} className={secondaryButton}>
                      Cerrar
                    </button>
                  )}
                  {q.status !== 'new' && (
                    <button type="button" onClick={() => void setStatus(q.id, 'new')} className={secondaryButton}>
                      Volver a nueva
                    </button>
                  )}
                  {confirmDelete === q.id ? (
                    <span className="ml-auto flex items-center gap-2 text-xs">
                      ¿Eliminar?
                      <button
                        type="button"
                        onClick={() => void remove(q.id)}
                        className="rounded-lg bg-destructive px-3 py-1.5 font-semibold text-white"
                      >
                        Sí
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className={secondaryButton}>
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(q.id)}
                      className="ml-auto rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
