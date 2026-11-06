'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { ReviewLimitsPanel } from '@/components/review-limits-panel'
import { ContentPanel } from '@/components/content-panel'
import { QuotesPanel } from '@/components/quotes-panel'
import { MediaManager } from '@/components/media-manager'
import {
  DEFAULT_QUOTE_DISCOUNT,
  FALLBACK_DISCOUNT_MESSAGE,
  normalizeQuoteDiscount,
  type QuoteDiscount,
} from '@/lib/quotes'
import { translate } from '@/lib/content'

type Review = {
  id: string
  name: string
  role: string
  rating: number
  text: string
  source?: 'public' | 'admin'
  approved?: boolean
  createdAt?: number
}

type Draft = Omit<Review, 'id'> & { date?: string } // date = 'YYYY-MM-DD' (vacío = hoy)

const EMPTY: Draft = { name: '', role: '', rating: 0, text: '', date: '' }

export default function AdminPage() {
  const { t } = useSite()
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsError, setReviewsError] = useState('')

  const loadReviews = () => {
    fetch('/api/reviews', { cache: 'no-store', headers: { 'x-admin-password': pass } })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setReviews(data)
      })
      .catch(() => setReviewsError('No se pudieron cargar las reseñas.'))
  }

  const addReview = async (draft: Draft) => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ action: 'add', review: draft }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setReviewsError(data?.error || 'No se pudo guardar la reseña.')
        return
      }
      setReviews(data.reviews)
      setReviewsError('')
    } catch {
      setReviewsError('Error de conexión al guardar la reseña.')
    }
  }

  const updateReview = async (id: string, draft: Draft) => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ action: 'update', id, review: draft }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setReviewsError(data?.error || 'No se pudo actualizar la reseña.')
        return
      }
      setReviews(data.reviews)
      setReviewsError('')
    } catch {
      setReviewsError('Error de conexión al actualizar la reseña.')
    }
  }

  const approveReview = async (id: string, approved: boolean) => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ action: 'approve', id, approved }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setReviewsError(data?.error || 'No se pudo actualizar la opinión.')
        return
      }
      setReviews(data.reviews)
      setReviewsError('')
    } catch {
      setReviewsError('Error de conexión al actualizar la opinión.')
    }
  }

  const deleteReview = async (id: string) => {
    if (!confirm('¿Borrar esta reseña?')) return
    try {
      const res = await fetch('/api/reviews', {
        method: 'DELETE',
        headers: jsonHeaders,
        body: JSON.stringify({ id }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setReviewsError(data?.error || 'No se pudo borrar la reseña.')
        return
      }
      setReviews(data.reviews)
    } catch {
      setReviewsError('Error de conexión al borrar la reseña.')
    }
  }

  type PromoOverride = {
    badgeEs: string
    titleEs: string
    textEs: string
    ctaEs: string
    badgeEn: string
    titleEn: string
    textEn: string
    ctaEn: string
  }
  const EMPTY_PROMO_OVERRIDE: PromoOverride = {
    badgeEs: '',
    titleEs: '',
    textEs: '',
    ctaEs: '',
    badgeEn: '',
    titleEn: '',
    textEn: '',
    ctaEn: '',
  }

  type SiteSettings = {
    promo: boolean
    coverage: boolean
    guarantee: boolean
    reviews: boolean
    legal: boolean
    about: boolean
    pilot: boolean
    promoOverride: PromoOverride
    quoteDiscount: QuoteDiscount
  }
  const DEFAULT_SETTINGS: SiteSettings = {
    promo: true,
    coverage: true,
    guarantee: true,
    reviews: true,
    legal: true,
    about: true,
    pilot: true,
    promoOverride: EMPTY_PROMO_OVERRIDE,
    quoteDiscount: DEFAULT_QUOTE_DISCOUNT,
  }

  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState('')

  const loadSettings = () => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data,
            promoOverride: { ...EMPTY_PROMO_OVERRIDE, ...(data.promoOverride ?? {}) },
            quoteDiscount: normalizeQuoteDiscount(data.quoteDiscount),
          })
        }
      })
      .catch(() => setSettingsError('No se pudo cargar la configuración.'))
  }

  const saveSettings = async (next: SiteSettings) => {
    setSettings(next) // optimista: se ve el cambio al instante
    setSettingsSaving(true)
    setSettingsError('')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ action: 'set', settings: next }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setSettingsError(data?.error || 'No se pudo guardar.')
        return
      }
      setSettings(data)
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 1500)
    } catch {
      setSettingsError('Error de conexión al guardar.')
    } finally {
      setSettingsSaving(false)
    }
  }

  // Cambia un campo de la casilla de descuento (todavía sin guardar: se guarda con el botón o el interruptor).
  const setQuoteDiscount = (patch: Partial<QuoteDiscount>) =>
    setSettings((prev) => ({ ...prev, quoteDiscount: { ...prev.quoteDiscount, ...patch } }))

  const [authed, setAuthed] = useState(false)
  const [pass, setPass] = useState('')
  const [error, setError] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [showForm, setShowForm] = useState(false)
  const jsonHeaders = { 'Content-Type': 'application/json', 'x-admin-password': pass }

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pass },
        body: JSON.stringify({ action: 'check' }),
      })
      if (res.ok) {
        setAuthed(true)
        setError(false)
        loadReviews()
        loadSettings()
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    }
  }

  const startAdd = () => {
    setEditingId(null)
    setDraft(EMPTY)
    setShowForm(true)
  }

  const startEdit = (r: Review) => {
    setEditingId(r.id)
    setDraft({
      name: r.name,
      role: r.role,
      rating: r.rating,
      text: r.text,
      date: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '',
    })
    setShowForm(true)
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.name.trim() || !draft.text.trim()) return
    if (editingId) updateReview(editingId, draft)
    else addReview(draft)
    setShowForm(false)
    setDraft(EMPTY)
    setEditingId(null)
  }


  // Casilla "mostrar / ocultar" de cada sección de la página principal.
  const visibilityToggle = (key: Exclude<keyof SiteSettings, 'promoOverride' | 'quoteDiscount'>, label: string) => (
    <label className="mt-4 flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition hover:bg-muted">
      <input
        type="checkbox"
        checked={settings[key]}
        onChange={(e) => saveSettings({ ...settings, [key]: e.target.checked })}
        className="h-4 w-4 rounded border-input accent-[var(--gold)]"
      />
      Mostrar en la web: {label}
      <span className="ml-auto text-xs font-normal text-muted-foreground">
        {settingsSaving ? 'Guardando…' : settingsSaved ? 'Guardado ✓' : ''}
      </span>
    </label>
  )

  // Cabecera de cada sección del admin, con el mismo orden que la página principal.
  const sectionHead = (n: number, title: string, desc: string) => (
    <>
      <h2 className="flex items-center gap-3 text-2xl font-extrabold">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-sm font-bold text-[var(--gold-foreground)]">
          {n}
        </span>
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </>
  )
  const sectionClass = 'mt-14 scroll-mt-20 border-t border-border pt-8'

  const INDEX: { id: string; label: string }[] = [
    { id: 'admin-inicio', label: 'Inicio' },
    { id: 'admin-descuento', label: 'Descuento' },
    { id: 'admin-servicios', label: 'Servicios' },
    { id: 'admin-sobre', label: 'Sobre nosotros' },
    { id: 'admin-piloto', label: 'Piloto' },
    { id: 'admin-cobertura', label: 'Cobertura' },
    { id: 'admin-legal', label: 'Legal' },
    { id: 'admin-garantia', label: 'Garantía' },
    { id: 'admin-resenas', label: 'Reseñas' },
    { id: 'admin-contacto', label: 'Contacto' },
  ]

  if (!authed) {
    return (
      <main className="flex min-h-[100svh] items-center justify-center px-4">
        <form
          onSubmit={login}
          className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl"
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gold)]/15 text-gold">
              <Lock className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-xl font-bold">{t('admin.login')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Dronesur · {t('admin.title')}</p>
          </div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="pass">
            {t('admin.password')}
          </label>
          <input
            id="pass"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
          />
          {error && <p className="mt-2 text-sm text-destructive">{t('admin.wrong')}</p>}
          <button
            type="submit"
            className="mt-5 w-full rounded-lg bg-[var(--gold)] px-4 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)]"
          >
            {t('admin.enter')}
          </button>
          <Link
            href="/"
            className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground transition hover:text-gold"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('admin.back')}
          </Link>
        </form>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">{t('admin.title')}</h1>
          <p className="text-sm text-muted-foreground">
            Drone<span className="text-gold">sur</span> · {reviews.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAuthed(false)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold transition hover:bg-muted"
          >
            {t('admin.logout')}
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold transition hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('admin.back')}
          </Link>
        </div>
      </div>


      {/* Índice: mismo orden que la página principal */}
      <nav
        aria-label="Secciones del admin"
        className="sticky top-0 z-20 -mx-4 mt-6 flex gap-2 overflow-x-auto border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
      >
        {INDEX.map((i, idx) => (
          <a
            key={i.id}
            href={`#${i.id}`}
            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition hover:border-[var(--gold)] hover:text-gold"
          >
            {idx + 1}. {i.label}
          </a>
        ))}
      </nav>
      <p className="mt-3 text-xs text-muted-foreground">
        Las secciones van en el mismo orden que la página principal. Cada una tiene su casilla para mostrarla u
        ocultarla en la web.
      </p>

      {/* 1 · INICIO (carrusel + música) */}
      <section id="admin-inicio" className={sectionClass}>
        {sectionHead(1, 'Inicio', 'Lo primero que se ve al abrir la web: el carrusel de vídeos y su música. Siempre visible.')}
        <MediaManager password={pass} only="hero" />
        <ContentPanel password={pass} show={['music']} />
      </section>

      {/* 2 · BANNER DE BIENVENIDA / DESCUENTO */}
      <section id="admin-descuento" className={sectionClass}>
        {sectionHead(2, 'Banner de bienvenida y descuento', 'El banner de descuento que sale debajo del carrusel y la casilla de descuento del formulario de presupuesto.')}
        {visibilityToggle('promo', 'Banner de bienvenida / descuento')}
        {settingsError && <p className="mt-2 text-sm text-destructive">{settingsError}</p>}
      {/* Panel: Texto del banner de descuento */}
      <div className="mt-8">
        <h3 className="text-lg font-bold">Texto del banner de descuento</h3>
        <p className="text-sm text-muted-foreground">
          Deja un campo en blanco para usar el texto de siempre. Rellénalo para
          sustituirlo (ej. cambiar "15%" por "20%", o poner "Oferta Halloween").
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveSettings(settings)
          }}
          className="mt-4 grid gap-6 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2"
        >
          {(
            [
              { lang: 'Español', badge: 'badgeEs', title: 'titleEs', text: 'textEs', cta: 'ctaEs' },
              { lang: 'English', badge: 'badgeEn', title: 'titleEn', text: 'textEn', cta: 'ctaEn' },
            ] as const
          ).map((col) => (
            <div key={col.lang} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">{col.lang}</h3>

              <div>
                <label className="mb-1 block text-xs font-medium">Insignia (ej. "NUEVOS CLIENTES")</label>
                <input
                  value={settings.promoOverride[col.badge]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      promoOverride: { ...settings.promoOverride, [col.badge]: e.target.value },
                    })
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">Título (ej. "15% de descuento")</label>
                <input
                  value={settings.promoOverride[col.title]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      promoOverride: { ...settings.promoOverride, [col.title]: e.target.value },
                    })
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">Texto descriptivo</label>
                <textarea
                  rows={2}
                  value={settings.promoOverride[col.text]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      promoOverride: { ...settings.promoOverride, [col.text]: e.target.value },
                    })
                  }
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">Texto del botón</label>
                <input
                  value={settings.promoOverride[col.cta]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      promoOverride: { ...settings.promoOverride, [col.cta]: e.target.value },
                    })
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                />
              </div>
            </div>
          ))}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={settingsSaving}
              className="rounded-full bg-[var(--gold)] px-6 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)] disabled:opacity-60"
            >
              {settingsSaving ? 'Guardando…' : 'Guardar texto del banner'}
            </button>
            {settingsSaved && <span className="ml-3 text-sm text-[var(--gold)]">Guardado ✓</span>}
          </div>
        </form>
      </div>


      {/* Panel: Casilla de descuento del formulario de presupuesto */}
      <div className="mt-8">
        <h3 className="text-lg font-bold">Casilla de descuento del formulario</h3>
        <p className="text-sm text-muted-foreground">
          Es el cuadro con la casilla que sale dentro del formulario de presupuesto («Aplicar mi 15% de
          descuento de bienvenida…»). Puedes ocultarlo y cambiar sus textos. Es independiente del banner de
          la página principal.
        </p>

        {/* Interruptor */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">
              Mostrar la casilla de descuento en el formulario:{' '}
              <span className={settings.quoteDiscount.enabled ? 'text-gold' : 'text-muted-foreground'}>
                {settings.quoteDiscount.enabled ? 'ACTIVADA' : 'DESACTIVADA'}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {settings.quoteDiscount.enabled
                ? 'La casilla aparece en el formulario y, si el cliente la marca, el mensaje incluye la frase del descuento.'
                : 'Desactivada: la casilla no aparece y el mensaje de WhatsApp o correo nunca menciona ningún descuento.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.quoteDiscount.enabled}
            aria-label="Mostrar la casilla de descuento en el formulario de presupuesto"
            onClick={() =>
              saveSettings({
                ...settings,
                quoteDiscount: { ...settings.quoteDiscount, enabled: !settings.quoteDiscount.enabled },
              })
            }
            disabled={settingsSaving}
            className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${
              settings.quoteDiscount.enabled ? 'bg-[var(--gold)]' : 'bg-muted'
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                settings.quoteDiscount.enabled ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Textos */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveSettings(settings)
          }}
          className="mt-4 grid gap-6 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2"
        >
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Deja un campo en blanco para usar el texto de siempre (el que ves en gris). Si cambias el 15% en
            español, cámbialo también en inglés.
          </p>
          {(
            [
              { lang: 'Español', code: 'es', label: 'labelEs', message: 'messageEs' },
              { lang: 'English', code: 'en', label: 'labelEn', message: 'messageEn' },
            ] as const
          ).map((col) => (
            <div key={col.lang} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">{col.lang}</h3>

              <div>
                <label className="mb-1 block text-xs font-medium">Texto de la casilla</label>
                <input
                  value={settings.quoteDiscount[col.label]}
                  onChange={(e) => setQuoteDiscount({ [col.label]: e.target.value })}
                  maxLength={200}
                  placeholder={translate('wa.discount', col.code)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">
                  Frase que se añade al mensaje de WhatsApp / correo
                </label>
                <textarea
                  rows={2}
                  value={settings.quoteDiscount[col.message]}
                  onChange={(e) => setQuoteDiscount({ [col.message]: e.target.value })}
                  maxLength={200}
                  placeholder={FALLBACK_DISCOUNT_MESSAGE[col.code]}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                />
              </div>
            </div>
          ))}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={settingsSaving}
              className="rounded-full bg-[var(--gold)] px-6 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)] disabled:opacity-60"
            >
              {settingsSaving ? 'Guardando…' : 'Guardar textos de la casilla'}
            </button>
            {settingsSaved && <span className="ml-3 text-sm text-[var(--gold)]">Guardado ✓</span>}
            {settingsError && <span className="ml-3 text-sm text-destructive">{settingsError}</span>}
          </div>
        </form>
      </div>


      </section>

      {/* 3 · SERVICIOS (categorías, fotos y vídeos) */}
      <section id="admin-servicios" className={sectionClass}>
        {sectionHead(3, 'Servicios', 'Las categorías de servicios de la web, con sus fotos, vídeos, álbumes, precios y textos. Siempre visibles.')}
        <MediaManager password={pass} only="categories" />
      </section>

      {/* 4 · SOBRE NOSOTROS */}
      <section id="admin-sobre" className={sectionClass}>
        {sectionHead(4, 'Sobre Nosotros', 'Textos y fotos de la sección «Sobre Dronesur».')}
        {visibilityToggle('about', 'Sobre Nosotros')}
        <ContentPanel password={pass} show={['about']} />
      </section>

      {/* 5 · SOBRE EL PILOTO */}
      <section id="admin-piloto" className={sectionClass}>
        {sectionHead(5, 'Sobre el piloto', 'Textos y foto de la sección del piloto.')}
        {visibilityToggle('pilot', 'Sobre el piloto')}
        <ContentPanel password={pass} show={['pilot']} />
      </section>

      {/* 6 · ZONAS DE COBERTURA */}
      <section id="admin-cobertura" className={sectionClass}>
        {sectionHead(6, 'Zonas de cobertura', 'La sección de zonas donde trabajas y las páginas propias de cada ciudad.')}
        {visibilityToggle('coverage', 'Zonas de cobertura')}
        <ContentPanel password={pass} show={['cities']} />
      </section>

      {/* 7 · SECCIÓN LEGAL */}
      <section id="admin-legal" className={sectionClass}>
        {sectionHead(7, 'Sección legal', 'Información legal sobre el uso de drones. El texto es fijo: aquí solo se muestra u oculta.')}
        {visibilityToggle('legal', 'Sección legal')}
      </section>

      {/* 8 · GARANTÍA LEGAL */}
      <section id="admin-garantia" className={sectionClass}>
        {sectionHead(8, 'Garantía legal', 'El banner de garantía. El texto es fijo: aquí solo se muestra u oculta.')}
        {visibilityToggle('guarantee', 'Garantía legal')}
      </section>

      {/* 9 · RESEÑAS */}
      <section id="admin-resenas" className={sectionClass}>
        {sectionHead(9, 'Reseñas de clientes', 'Opiniones que se ven en la web: añade, edita, aprueba o borra, y controla el límite que puede enviar el público.')}
        {visibilityToggle('reviews', 'Reseñas de clientes')}
      <div className="mt-6">
        {!showForm && (
          <button
            onClick={startAdd}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)]"
          >
            <Plus className="h-4 w-4" />
            {t('admin.add')}
          </button>
        )}

        {showForm && (
          <form onSubmit={save} className="rounded-2xl border border-border bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="a-name">
                  {t('admin.name')}
                </label>
                <input
                  id="a-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="a-role">
                  {t('admin.role')}
                </label>
                <input
                  id="a-role"
                  value={draft.role}
                  onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="a-date">
                Fecha de la reseña
              </label>
              <input
                id="a-date"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={draft.date ?? ''}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] sm:w-60"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Pon el día real en que el cliente te escribió la opinión. La web muestra
                «Hace X días» calculado desde esta fecha. Si lo dejas vacío, se usa hoy.
              </p>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium">{t('admin.rating')}</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDraft({ ...draft, rating: n })}
                    aria-label={`${n}`}
                  >
                    <Star
                      className={`h-6 w-6 transition ${
                        n <= draft.rating
                          ? 'fill-[var(--gold)] text-[var(--gold)]'
                          : 'text-muted-foreground/40'
                      }`}
                    />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, rating: 0 })}
                  className={`ml-3 rounded-full border px-3 text-xs font-semibold transition ${
                    draft.rating === 0
                      ? 'border-[var(--gold)] text-gold'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Sin estrellas
                </button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Pon estrellas solo si la persona te dio una puntuación. Si te escribió un mensaje
                sin puntuar, déjalo «Sin estrellas»: no inventes una nota por ella.
              </p>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="a-text">
                {t('admin.text')}
              </label>
              <textarea
                id="a-text"
                rows={3}
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="submit"
                className="rounded-full bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)]"
              >
                {t('admin.save')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                  setDraft(EMPTY)
                }}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
              >
                {t('admin.cancel')}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-8 space-y-3">
        {reviews.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t('admin.empty')}
          </p>
        )}
        {reviews.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{r.name}</p>
                {r.approved === false && (
                  <span className="rounded-full bg-[var(--gold)] px-2 py-0.5 text-[10px] font-bold text-[var(--gold-foreground)]">
                    PENDIENTE
                  </span>
                )}
                <span className="flex">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-[var(--gold)] text-[var(--gold)]" />
                  ))}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {r.role}
                {r.createdAt ? `${r.role ? ' · ' : ''}${new Date(r.createdAt).toLocaleDateString('es-ES')}` : ''}
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm text-foreground/90">{r.text}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              {r.approved === false && (
                <button
                  onClick={() => approveReview(r.id, true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)]"
                >
                  Aprobar
                </button>
              )}
              <button
                onClick={() => startEdit(r)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('admin.edit')}
              </button>
              <button
                onClick={() => deleteReview(r.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('admin.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {reviewsError && <p className="mt-2 text-sm text-destructive">{reviewsError}</p>}


        <ReviewLimitsPanel password={pass} />
      </section>

      {/* 10 · CONTACTO (solicitudes de presupuesto) */}
      <section id="admin-contacto" className={sectionClass}>
        {sectionHead(10, 'Contacto', 'Los formularios de contacto y presupuesto que llegan desde la web. Siempre visible.')}
        <QuotesPanel password={pass} />
      </section>
    </main>
  )
}
