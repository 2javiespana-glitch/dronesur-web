'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { LEGAL } from '@/lib/legal'
import { LINK_LIMITS, slugify, type CampaignLink, type LinkMode } from '@/lib/campaign-links'

// Panel del admin: «Carteles y enlaces».
// Crea direcciones cortas (dronesur.es/cartel1) para carteles, tarjetas y QR. Cada una puede llevar directo a la
// web o enseñar antes una página de aviso con la oferta. Habla con /api/links (solo admin).

type Row = CampaignLink & { scans: number; visits: number }

type Draft = {
  isNew: boolean
  slug: string
  name: string
  mode: LinkMode
  target: string
  active: boolean
  title: { es: string; en: string }
  text: { es: string; en: string }
  button: { es: string; en: string }
}

const EMPTY_DRAFT: Draft = {
  isNew: true,
  slug: '',
  name: '',
  mode: 'redirect',
  target: '/',
  active: true,
  title: { es: '', en: '' },
  text: { es: '', en: '' },
  button: { es: '', en: '' },
}

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] disabled:opacity-60'
const primaryButton =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--gold)] px-3.5 py-2 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)] disabled:opacity-60'
const secondaryButton =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-60'

const RANGES = [7, 30, 90]

function publicUrl(slug: string) {
  return `https://${LEGAL.web}/${slug}`
}

export function LinksPanel({ password }: { password: string }) {
  const [days, setDays] = useState(30)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [copied, setCopied] = useState('')

  const load = useCallback(async () => {
    setLoadError('')
    try {
      const res = await fetch(`/api/links?days=${days}`, { cache: 'no-store', headers: { 'x-admin-password': password } })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'No se pudieron cargar los enlaces.')
      setRows(json.links as Row[])
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'No se pudieron cargar los enlaces.')
    }
  }, [days, password])

  useEffect(() => {
    void load()
  }, [load])

  const call = async (payload: unknown): Promise<string | null> => {
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => null)
      return res.ok ? null : json?.error || 'No se pudo guardar.'
    } catch {
      return 'Error de conexión. Inténtalo de nuevo.'
    }
  }

  const save = async () => {
    if (!draft) return
    const slug = slugify(draft.slug)
    if (!slug) {
      setFormError('Escribe la dirección del enlace (por ejemplo cartel1).')
      return
    }
    setSaving(true)
    setFormError('')
    const error = await call({ action: 'save', isNew: draft.isNew, link: { ...draft, slug } })
    setSaving(false)
    if (error) {
      setFormError(error)
      return
    }
    setDraft(null)
    void load()
  }

  const toggleActive = async (row: Row) => {
    const error = await call({ action: 'save', isNew: false, link: { ...row, active: !row.active } })
    if (error) setLoadError(error)
    void load()
  }

  const remove = async (row: Row) => {
    if (!window.confirm(`¿Borrar el enlace «${row.slug}»? Los carteles que ya tengan este enlace darán «página no encontrada».`)) return
    const error = await call({ action: 'delete', slug: row.slug })
    if (error) setLoadError(error)
    void load()
  }

  const copy = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(publicUrl(slug))
      setCopied(slug)
      setTimeout(() => setCopied((c) => (c === slug ? '' : c)), 1800)
    } catch {
      window.prompt('Copia este enlace:', publicUrl(slug))
    }
  }

  const edit = (row: Row) =>
    setDraft({
      isNew: false,
      slug: row.slug,
      name: row.name,
      mode: row.mode,
      target: row.target,
      active: row.active,
      title: { ...row.title },
      text: { ...row.text },
      button: { ...row.button },
    })

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d))
  const setLoc = (key: 'title' | 'text' | 'button', lang: 'es' | 'en', value: string) =>
    setDraft((d) => (d ? { ...d, [key]: { ...d[key], [lang]: value } } : d))

  const max = Math.max(1, ...(rows ?? []).map((r) => r.scans))

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        <p>
          Crea una dirección corta para cada cartel, tarjeta o QR, por ejemplo{' '}
          <span className="font-mono text-foreground">{LEGAL.web}/cartel1</span>, y así sabes cuál te trae más gente.
          Cada enlace puede <strong className="text-foreground">ir directo a la web</strong> o{' '}
          <strong className="text-foreground">enseñar antes una página de aviso</strong> que explica la oferta del
          cartel y tiene un botón a la web. Esa página solo la ve quien entra por el enlace.
        </p>
      </div>

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {!draft && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className={primaryButton}
            onClick={() => {
              setFormError('')
              setDraft({ ...EMPTY_DRAFT })
            }}
          >
            <Plus className="h-4 w-4" /> Nuevo enlace
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Aperturas de los últimos
            {RANGES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDays(n)}
                className={`rounded-full px-3 py-1 font-semibold transition ${
                  days === n ? 'bg-[var(--gold)] text-[var(--gold-foreground)]' : 'border border-border hover:bg-muted'
                }`}
              >
                {n} días
              </button>
            ))}
          </div>
        </div>
      )}

      {draft && (
        <div className="rounded-2xl border border-[var(--gold)]/50 bg-card p-5">
          <h3 className="text-base font-bold">{draft.isNew ? 'Nuevo enlace' : `Editar «${draft.slug}»`}</h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Dirección</label>
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 text-sm text-muted-foreground">{LEGAL.web}/</span>
                <input
                  value={draft.slug}
                  onChange={(e) => set('slug', e.target.value)}
                  onBlur={() => set('slug', slugify(draft.slug))}
                  disabled={!draft.isNew}
                  maxLength={30}
                  placeholder="cartel1"
                  className={`${inputClass} font-mono`}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {draft.isNew
                  ? 'Solo letras sin tilde, números y guiones. Después no se puede cambiar (el cartel ya impreso dejaría de funcionar).'
                  : 'La dirección no se puede cambiar, para que los carteles ya impresos sigan funcionando.'}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nombre (solo para ti)</label>
              <input
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                maxLength={LINK_LIMITS.name}
                placeholder="Cartel de bares, calle Mayor"
                className={inputClass}
              />
            </div>
          </div>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium">¿Qué pasa cuando alguien lo abre?</legend>
            <div className="grid gap-3 md:grid-cols-2">
              {(
                [
                  ['redirect', 'Ir directo', 'Va a la web sin enseñar nada antes.'],
                  ['landing', 'Mostrar una página de aviso', 'Explica la oferta del cartel y tiene un botón a la web.'],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm transition ${
                    draft.mode === value ? 'border-[var(--gold)] bg-[var(--gold)]/10' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="link-mode"
                    checked={draft.mode === value}
                    onChange={() => set('mode', value)}
                    className="mt-1 accent-[var(--gold)]"
                  />
                  <span>
                    <span className="block font-semibold">{label}</span>
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-medium">A dónde lleva</label>
            <input
              value={draft.target}
              onChange={(e) => set('target', e.target.value)}
              maxLength={LINK_LIMITS.target}
              className={`${inputClass} font-mono`}
              placeholder="/"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-mono">/</span> es la portada. También puedes poner otra página de la web, por
              ejemplo <span className="font-mono">/servicios/eventos</span> o{' '}
              <span className="font-mono">/#servicios</span>.
            </p>
          </div>

          {draft.mode === 'landing' && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Título (español)</label>
                <input
                  value={draft.title.es}
                  onChange={(e) => setLoc('title', 'es', e.target.value)}
                  maxLength={LINK_LIMITS.title}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Título (inglés)</label>
                <input
                  value={draft.title.en}
                  onChange={(e) => setLoc('title', 'en', e.target.value)}
                  maxLength={LINK_LIMITS.title}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Texto de la oferta (español)</label>
                <textarea
                  value={draft.text.es}
                  onChange={(e) => setLoc('text', 'es', e.target.value)}
                  maxLength={LINK_LIMITS.text}
                  rows={5}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Texto de la oferta (inglés)</label>
                <textarea
                  value={draft.text.en}
                  onChange={(e) => setLoc('text', 'en', e.target.value)}
                  maxLength={LINK_LIMITS.text}
                  rows={5}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Texto del botón (español)</label>
                <input
                  value={draft.button.es}
                  onChange={(e) => setLoc('button', 'es', e.target.value)}
                  maxLength={LINK_LIMITS.button}
                  placeholder="Ir a la web principal"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Texto del botón (inglés)</label>
                <input
                  value={draft.button.en}
                  onChange={(e) => setLoc('button', 'en', e.target.value)}
                  maxLength={LINK_LIMITS.button}
                  placeholder="Go to the main site"
                  className={inputClass}
                />
              </div>
              <p className="text-xs text-muted-foreground md:col-span-2">
                Si dejas el inglés vacío, esa versión mostrará el texto en español. Escribe solo ofertas que puedas
                cumplir: lo que pones aquí es una promesa pública.
              </p>
            </div>
          )}

          <label className="mt-5 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => set('active', e.target.checked)}
              className="h-4 w-4 accent-[var(--gold)]"
            />
            Enlace activo (si lo desactivas, quien lo abra verá «página no encontrada»)
          </label>

          {formError && <p className="mt-4 text-sm text-destructive">{formError}</p>}

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className={primaryButton} onClick={() => void save()} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar enlace'}
            </button>
            <button
              type="button"
              className={secondaryButton}
              onClick={() => {
                setDraft(null)
                setFormError('')
              }}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-base font-bold">Tus enlaces</h3>
          <span className="text-sm text-muted-foreground">{rows ? `${rows.length}` : 'Cargando...'}</span>
        </div>

        {rows && rows.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            Todavía no has creado ninguno. Pulsa «Nuevo enlace» para crear el primero.
          </p>
        )}

        <ul className="mt-4 divide-y divide-border">
          {rows?.map((row) => (
            <li key={row.slug} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-all font-mono text-sm font-semibold">
                    {LEGAL.web}/{row.slug}
                    {!row.active && (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 font-sans text-[11px] font-medium text-muted-foreground">
                        Desactivado
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.name !== row.slug ? `${row.name} · ` : ''}
                    {row.mode === 'landing' ? 'Página de aviso' : 'Va directo'} → <span className="font-mono">{row.target}</span>
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>
                    <span className="text-base font-bold tabular-nums text-foreground">{row.scans}</span> aperturas
                  </p>
                  <p>
                    <span className="font-semibold tabular-nums text-foreground">{row.visits}</span> visitas a la web
                  </p>
                </div>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[var(--gold)]"
                  style={{ width: `${row.scans === 0 ? 0 : Math.max(3, Math.round((row.scans / max) * 100))}%` }}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={secondaryButton} onClick={() => void copy(row.slug)}>
                  {copied === row.slug ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === row.slug ? 'Copiado' : 'Copiar enlace'}
                </button>
                <a
                  href={`/${row.slug}?prueba=1`}
                  target="_blank"
                  rel="noopener"
                  className={secondaryButton}
                  title="Se abre sin contar como visita"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Probar
                </a>
                <button type="button" className={secondaryButton} onClick={() => edit(row)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                <button type="button" className={secondaryButton} onClick={() => void toggleActive(row)}>
                  {row.active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  className={`${secondaryButton} text-destructive`}
                  onClick={() => void remove(row)}
                  aria-label={`Borrar ${row.slug}`}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        <strong>Aperturas</strong> = las veces que alguien ha abierto el enlace (escaneando el QR o escribiéndolo). No
        se guarda ninguna IP ni dato de la persona, y no cuenta robots ni la vista de «Probar».{' '}
        <strong>Visitas a la web</strong> = las que además han llegado a la web y han aceptado las cookies de
        estadísticas, así que siempre serán menos. Para comparar carteles, fíjate en las aperturas.
      </p>
    </div>
  )
}
