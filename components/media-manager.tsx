'use client'

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Box,
  Film,
  Folder,
  Globe,
  ImageIcon,
  Link2,
  Pencil,
  Play,
  Plus,
  X,
} from 'lucide-react'
import { CATEGORIES, type Category, type Localized } from '@/lib/content'
import { uploadToCloudinaryDetailed } from '@/lib/cloudinary'
import {
  type AlbumItem,
  type MediaItem,
  type MediaKind,
  type UploadKind,
  checkFile,
  kindLabel,
  kindOf,
  stripExtension,
  thumbnailOf,
} from '@/lib/media-admin'

// Gestor de contenido del admin. Se ve igual que la web:
//   1) una cuadrícula con las categorías (y el carrusel de inicio);
//   2) al entrar en una, ves sus álbumes con las miniaturas de las fotos y vídeos,
//      un botón «Añadir» para subir más y, al pasar el ratón por una miniatura,
//      un cuadradito para eliminarla (con confirmación).
// Desde aquí también se editan los textos de la categoría, su portada y su visibilidad.
// Habla con /api/categories, /api/media y /api/albums, que solo guardan con la contraseña de admin.

const HERO = 'hero'

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]'
const primaryButton =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)] disabled:opacity-60'
const secondaryButton =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold transition hover:bg-muted disabled:opacity-60'

type Target = { category: string; albumId?: string }
type UploadState = { key: string; label: string; percent: number }

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

async function call<T>(
  url: string,
  method: 'POST' | 'DELETE',
  password: string,
  body: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: data?.error || 'No se pudo completar la acción.' }
    return { ok: true, data: data as T }
  } catch {
    return { ok: false, error: 'Error de conexión. Inténtalo de nuevo.' }
  }
}

const targetKey = (t: Target) => `${t.category}:${t.albumId ?? ''}`

// ---------------------------------------------------------------------------
// Piezas pequeñas
// ---------------------------------------------------------------------------

function KindIcon({ kind, className }: { kind: MediaKind; className?: string }) {
  if (kind === 'video') return <Film className={className} />
  if (kind === 'model3d') return <Box className={className} />
  if (kind === 'embed') return <Link2 className={className} />
  if (kind === 'panorama') return <Globe className={className} />
  return <ImageIcon className={className} />
}

// Imagen con respaldo: si no carga (o no hay), se ve un icono en vez de una imagen rota.
function Thumb({ src, kind, alt }: { src: string | null; kind: MediaKind; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#0b0e14] to-[#1a1f2b] text-white/50">
        <KindIcon kind={kind} className="h-7 w-7" />
        <span className="text-[10px] font-medium">{kindLabel(kind)}</span>
      </div>
    )
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
}

function Message({ children, tone }: { children: React.ReactNode; tone: 'error' | 'ok' }) {
  return (
    <p className={tone === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{children}</p>
  )
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl ${
          wide ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-md p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

type ConfirmState = { title: string; text: string; confirmLabel: string; run: () => Promise<void> }

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal title={state.title} onClose={busy ? () => {} : onClose}>
      <p className="text-sm text-muted-foreground">{state.text}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={busy} className={secondaryButton}>
          Cancelar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await state.run()
            setBusy(false)
            onClose()
          }}
          className="inline-flex items-center justify-center rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? 'Eliminando...' : state.confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

// Una foto o vídeo con su miniatura. Al pasar el ratón aparece el cuadradito para eliminarlo
// (en el móvil, que no tiene ratón, se ve siempre).
function MediaTile({
  item,
  onDelete,
  onEdit,
}: {
  item: MediaItem
  onDelete: () => void
  onEdit?: () => void // abre la descripción de la foto (solo para fotos)
}) {
  const kind = kindOf(item)
  const missingAlt = !!onEdit && !item.alt
  return (
    <div
      className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted"
      title={item.title || kindLabel(kind)}
    >
      <Thumb src={thumbnailOf(item)} kind={kind} alt={item.title || kindLabel(kind)} />
      {kind === 'video' && (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
          <Play className="h-3 w-3 fill-current" />
        </span>
      )}
      {kind === 'panorama' && (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
          360°
        </span>
      )}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label="Descripción de la foto"
          title={missingAlt ? 'Sin descripción: pulsa para escribirla' : 'Editar la descripción de la foto'}
          className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-black/70 text-white opacity-0 transition hover:bg-[var(--gold)] hover:text-[var(--gold-foreground)] focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {missingAlt && (
        <span
          className="pointer-events-none absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-[var(--gold)] shadow"
          title="Sin descripción"
        />
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label="Eliminar"
        title="Eliminar"
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-black/70 text-white opacity-0 transition hover:bg-destructive focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// Ventana para escribir la descripción de una foto (lo que lee Google y los lectores de pantalla).
function AltDialog({
  item,
  onClose,
  onSave,
}: {
  item: MediaItem
  onClose: () => void
  onSave: (alt: string, altEn: string) => Promise<string | null>
}) {
  const [alt, setAlt] = useState(item.alt ?? '')
  const [altEn, setAltEn] = useState(item.altEn ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  return (
    <Modal title="Descripción de la foto" onClose={onClose}>
      <div className="mb-4 h-32 w-48 overflow-hidden rounded-lg border border-border">
        <Thumb src={thumbnailOf(item)} kind={kindOf(item)} alt="" />
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        No se ve en la web: la leen Google (para entender la foto y poder mostrarla en Google Imágenes) y los
        lectores de pantalla. Describe lo que se ve y dónde, en una frase corta y natural.
        <br />
        <span className="text-foreground">Ejemplo:</span> «Vista aérea de un hotel frente al mar en Roquetas de Mar,
        Almería». Evita repetir palabras clave y no empieces con «Foto de…».
      </p>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setSaving(true)
          setError('')
          const problem = await onSave(alt, altEn)
          setSaving(false)
          if (problem) setError(problem)
          else onClose()
        }}
      >
        <div>
          <label className="mb-1 flex justify-between text-xs font-medium">
            <span>Descripción en español</span>
            <span className="text-muted-foreground">{alt.length}/200</span>
          </label>
          <input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 flex justify-between text-xs font-medium">
            <span>Descripción en inglés (opcional)</span>
            <span className="text-muted-foreground">{altEn.length}/200</span>
          </label>
          <input value={altEn} onChange={(e) => setAltEn(e.target.value)} maxLength={200} className={inputClass} />
        </div>
        {error && <Message tone="error">{error}</Message>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// El botón «Añadir»: un cuadrado con borde discontinuo al final de las miniaturas.
// Se puede pulsar para elegir archivos o arrastrar archivos encima.
function AddTile({
  accept,
  multiple,
  upload,
  uploadKey,
  onFiles,
}: {
  accept: string
  multiple: boolean
  upload: UploadState | null
  uploadKey: string
  onFiles: (files: File[]) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const busy = upload?.key === uploadKey
  const otherBusy = !!upload && !busy

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        if (!upload) onFiles(Array.from(e.dataTransfer.files ?? []))
      }}
      className={`flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition ${
        dragOver ? 'border-[var(--gold)] bg-[var(--gold)]/10' : 'border-border hover:border-[var(--gold)] hover:text-gold'
      } ${otherBusy ? 'pointer-events-none opacity-50' : ''}`}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={!!upload}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length > 0) onFiles(files)
        }}
      />
      {busy ? (
        <>
          <span className="text-sm font-semibold">Subiendo {upload?.label}</span>
          <span className="text-xs text-muted-foreground">{upload?.percent}%</span>
        </>
      ) : (
        <>
          <Plus className="h-7 w-7" />
          <span className="text-sm font-semibold">Añadir</span>
        </>
      )}
    </label>
  )
}

function Section({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Folder className="h-4 w-4 shrink-0 text-[var(--gold)]" />
          <h4 className="truncate text-sm font-bold">{title}</h4>
          {subtitle && <span className="shrink-0 text-xs text-muted-foreground">{subtitle}</span>}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formulario de textos de una categoría (sirve para crear una nueva y para editar una existente)
// ---------------------------------------------------------------------------
type CategoryTexts = {
  title: Localized
  short: Localized
  description: Localized
  includes: Localized // los puntos de «qué incluye», una línea por punto
  price: Localized
}

function CategoryForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: CategoryTexts
  submitLabel: string
  onSubmit: (texts: CategoryTexts) => Promise<string | null> // devuelve un error, o null si fue bien
}) {
  const [t, setT] = useState<CategoryTexts>(initial)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const set = (field: keyof CategoryTexts, lang: 'es' | 'en', value: string) =>
    setT((prev) => ({ ...prev, [field]: { ...prev[field], [lang]: value } }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!t.title.es.trim()) {
      setMessage({ ok: false, text: 'Ponle al menos un título en español.' })
      return
    }
    setSaving(true)
    setMessage(null)
    const error = await onSubmit(t)
    setSaving(false)
    setMessage(error ? { ok: false, text: error } : { ok: true, text: 'Guardado.' })
  }

  const cols = [
    { lang: 'es' as const, name: 'Español' },
    { lang: 'en' as const, name: 'English (opcional)' },
  ]

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-5 md:grid-cols-2">
        {cols.map((col) => (
          <div key={col.lang} className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground">{col.name}</h4>
            <div>
              <label className="mb-1 block text-xs font-medium">Título</label>
              <input
                value={t.title[col.lang]}
                onChange={(e) => set('title', col.lang, e.target.value)}
                maxLength={120}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Resumen corto (tarjeta de la portada)</label>
              <input
                value={t.short[col.lang]}
                onChange={(e) => set('short', col.lang, e.target.value)}
                maxLength={300}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 flex justify-between text-xs font-medium">
                <span>Descripción (dentro de la categoría)</span>
                <span className="text-muted-foreground">{t.description[col.lang].length}/4000</span>
              </label>
              <textarea
                rows={8}
                value={t.description[col.lang]}
                onChange={(e) => set('description', col.lang, e.target.value)}
                maxLength={4000}
                placeholder={
                  col.lang === 'es'
                    ? 'Explica qué haces, para quién, cómo trabajas y en cuánto tiempo entregas. Deja una línea en blanco entre párrafos.'
                    : 'Explain what you do, who it is for, how you work and the delivery time. Leave a blank line between paragraphs.'
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Qué incluye (una línea por punto, máximo 10)</label>
              <textarea
                rows={5}
                value={t.includes[col.lang]}
                onChange={(e) => set('includes', col.lang, e.target.value)}
                placeholder={
                  col.lang === 'es'
                    ? 'Ej.:\nVuelo con dron en 4K con piloto certificado\n30 fotos editadas en alta resolución\nVídeo de 60 segundos listo para redes\nEntrega en 48 horas'
                    : 'E.g.:\n4K drone flight with a certified pilot\n30 edited high-resolution photos\n60-second video ready for social media\n48-hour delivery'
                }
                className={inputClass}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Si lo dejas vacío, se muestran los 4 puntos de siempre, iguales para todas las categorías.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Precio (ej. «desde 30 €/hora»)</label>
              <input
                value={t.price[col.lang]}
                onChange={(e) => set('price', col.lang, e.target.value)}
                maxLength={80}
                className={inputClass}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Si dejas el inglés vacío, esa versión de la web mostrará el texto en español.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? 'Guardando...' : submitLabel}
        </button>
        {message && <Message tone={message.ok ? 'ok' : 'error'}>{message.text}</Message>}
      </div>
    </form>
  )
}

const EMPTY_LOCALIZED: Localized = { es: '', en: '' }

// ---------------------------------------------------------------------------
// Ventana para tipos especiales: foto 360°, modelo 3D, enlaces
// ---------------------------------------------------------------------------
type SpecialKind = 'panorama' | 'model3d' | 'embed' | 'url'

const SPECIAL_HELP: Record<SpecialKind, string> = {
  panorama:
    'Una foto panorámica esférica en formato 2:1 (el doble de ancha que alta), como las del modo «Esfera» del dron. Máximo 10 MB: unos 6000 × 3000 píxeles en JPG.',
  model3d:
    'Un único archivo .glb de máximo 10 MB. Si tu modelo pesa más, súbelo a Sketchfab (gratis) y usa «Enlace incrustado».',
  embed:
    'No se sube ningún archivo: pega la dirección del modelo o del recorrido. Solo se admiten Sketchfab, Kuula y Matterport.',
  url: 'Pega la dirección de una foto o vídeo que ya esté alojado en otro sitio (debe empezar por https://).',
}

function SpecialDialog({
  onClose,
  onFile,
  onUrl,
}: {
  onClose: () => void
  onFile: (kind: UploadKind, file: File) => void
  onUrl: (kind: 'embed' | 'url', url: string) => Promise<string | null>
}) {
  const [kind, setKind] = useState<SpecialKind>('panorama')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const options: { value: SpecialKind; label: string }[] = [
    { value: 'panorama', label: 'Foto 360°' },
    { value: 'model3d', label: 'Modelo 3D (.glb)' },
    { value: 'embed', label: 'Enlace (Sketchfab, Kuula, Matterport)' },
    { value: 'url', label: 'Foto o vídeo por enlace' },
  ]
  const isFile = kind === 'panorama' || kind === 'model3d'

  return (
    <Modal title="Otros tipos de contenido" onClose={onClose}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              setKind(o.value)
              setError('')
            }}
            className={
              kind === o.value
                ? 'rounded-lg bg-[var(--gold)] px-3 py-1.5 text-xs font-semibold text-[var(--gold-foreground)]'
                : 'rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted'
            }
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{SPECIAL_HELP[kind]}</p>

      {isFile ? (
        <div className="mt-5">
          <input
            ref={fileRef}
            type="file"
            accept={kind === 'model3d' ? '.glb,model/gltf-binary' : 'image/*'}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              onFile(kind as UploadKind, file)
              onClose()
            }}
          />
          <button type="button" onClick={() => fileRef.current?.click()} className={primaryButton}>
            {kind === 'panorama' ? 'Elegir la foto 360°' : 'Elegir el modelo .glb'}
          </button>
        </div>
      ) : (
        <form
          className="mt-5 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!url.trim()) return
            setBusy(true)
            setError('')
            const problem = await onUrl(kind as 'embed' | 'url', url.trim())
            setBusy(false)
            if (problem) setError(problem)
            else onClose()
          }}
        >
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
          <button type="submit" disabled={busy || !url.trim()} className={primaryButton}>
            {busy ? 'Añadiendo...' : 'Añadir'}
          </button>
        </form>
      )}
      {error && (
        <div className="mt-3">
          <Message tone="error">{error}</Message>
        </div>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// El gestor
// ---------------------------------------------------------------------------
export function MediaManager({ password }: { password: string }) {
  const [categories, setCategories] = useState<Category[]>(CATEGORIES)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [albums, setAlbums] = useState<AlbumItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [openSlug, setOpenSlug] = useState<string | null>(null) // null = lista; 'hero' = carrusel
  const [errors, setErrors] = useState<string[]>([])
  const [upload, setUpload] = useState<UploadState | null>(null)

  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [special, setSpecial] = useState<Target | null>(null)
  const [altItem, setAltItem] = useState<MediaItem | null>(null)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [showTexts, setShowTexts] = useState(false)
  const [newAlbumTitle, setNewAlbumTitle] = useState('')
  const [creatingAlbum, setCreatingAlbum] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const navigated = useRef(false)

  // El gestor está al final de una página larga: al entrar en una categoría (o volver a la lista)
  // la pantalla se desplaza sola hasta aquí para no tener que buscarlo.
  useEffect(() => {
    if (openSlug !== null) navigated.current = true
    if (!navigated.current) return
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [openSlug])

  const loadAll = useCallback(async () => {
    try {
      const [c, m, a] = await Promise.all([
        fetch('/api/categories', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/media', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/albums', { cache: 'no-store' }).then((r) => r.json()),
      ])
      if (Array.isArray(c)) setCategories(c)
      setMedia(Array.isArray(m) ? m : [])
      setAlbums(Array.isArray(a) ? a : [])
      setLoadError('')
    } catch {
      setLoadError('No se pudo cargar el contenido. Recarga la página.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const addError = (text: string) => setErrors((prev) => (prev.includes(text) ? prev : [...prev, text]))

  // ----- acciones sobre el servidor -----
  const addMedia = async (item: Omit<MediaItem, 'id'>): Promise<boolean> => {
    const res = await call<{ items: MediaItem[] }>('/api/media', 'POST', password, { action: 'add', item })
    if (!res.ok) {
      addError(res.error)
      return false
    }
    setMedia(res.data.items)
    return true
  }

  const saveAlt = async (id: string, alt: string, altEn: string): Promise<string | null> => {
    const res = await call<{ items: MediaItem[] }>('/api/media', 'POST', password, { action: 'update', id, alt, altEn })
    if (!res.ok) return res.error
    setMedia(res.data.items)
    return null
  }

  const removeMedia = async (id: string): Promise<boolean> => {
    const res = await call<{ items: MediaItem[] }>('/api/media', 'DELETE', password, { id })
    if (!res.ok) {
      addError(res.error)
      return false
    }
    setMedia(res.data.items)
    return true
  }

  const createAlbum = async (category: string) => {
    const title = newAlbumTitle.trim()
    if (!title) return
    setCreatingAlbum(true)
    const res = await call<{ albums: AlbumItem[] }>('/api/albums', 'POST', password, {
      action: 'add',
      album: { category, title },
    })
    setCreatingAlbum(false)
    if (!res.ok) {
      addError(res.error)
      return
    }
    setAlbums(res.data.albums)
    setNewAlbumTitle('')
  }

  const removeAlbum = async (id: string) => {
    const res = await call<{ albums: AlbumItem[] }>('/api/albums', 'DELETE', password, { id })
    if (!res.ok) {
      addError(res.error)
      return
    }
    setAlbums(res.data.albums)
    // El servidor también borra las fotos y vídeos del álbum: se vuelve a leer la lista.
    const m = await fetch('/api/media', { cache: 'no-store' }).then((r) => r.json()).catch(() => null)
    if (Array.isArray(m)) setMedia(m)
  }

  const saveCategoryTexts = async (slug: string, texts: CategoryTexts): Promise<string | null> => {
    const res = await call<{ categories: Category[] }>('/api/categories', 'POST', password, {
      action: 'update',
      slug,
      category: texts,
    })
    if (!res.ok) return res.error
    setCategories(res.data.categories)
    return null
  }

  const setCategoryVisible = async (slug: string, visible: boolean) => {
    setCategories((prev) => prev.map((c) => (c.slug === slug ? { ...c, visible } : c))) // se ve al instante
    const res = await call<{ categories: Category[] }>('/api/categories', 'POST', password, {
      action: 'update',
      slug,
      category: { visible },
    })
    if (!res.ok) {
      addError(res.error)
      void loadAll()
      return
    }
    setCategories(res.data.categories)
  }

  const createCategory = async (texts: CategoryTexts): Promise<string | null> => {
    const res = await call<{ categories: Category[] }>('/api/categories', 'POST', password, {
      action: 'add',
      category: texts,
    })
    if (!res.ok) return res.error
    setCategories(res.data.categories)
    const created = res.data.categories[res.data.categories.length - 1]
    setShowNewCategory(false)
    if (created) setOpenSlug(created.slug)
    return null
  }

  // ----- subidas -----
  const runUpload = async (files: File[], target: Target, kind: UploadKind = 'normal') => {
    if (files.length === 0) return
    setErrors([])
    const key = targetKey(target)
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const label = files.length > 1 ? `${i + 1} de ${files.length}` : ''

      if (target.category === HERO && !file.type.startsWith('video/')) {
        addError(`"${file.name}" no es un vídeo. El carrusel de inicio solo usa vídeos.`)
        continue
      }
      const problem = checkFile(file, kind)
      if (problem) {
        addError(problem)
        continue
      }

      setUpload({ key, label, percent: 0 })
      try {
        const endpoint = kind === 'model3d' ? 'raw' : kind === 'panorama' ? 'image' : 'auto'
        const result = await uploadToCloudinaryDetailed(file, endpoint, (percent) =>
          setUpload((u) => (u ? { ...u, percent } : u)),
        )
        const type: MediaKind =
          kind === 'panorama'
            ? 'panorama'
            : kind === 'model3d'
              ? 'model3d'
              : result.resourceType === 'video'
                ? 'video'
                : 'image'
        const ok = await addMedia({
          title: stripExtension(file.name),
          url: result.url,
          category: target.category,
          type,
          ...(target.albumId ? { albumId: target.albumId } : {}),
        })
        if (!ok) break
      } catch (e) {
        addError(e instanceof Error ? e.message : 'No se pudo subir el archivo.')
      }
    }
    setUpload(null)
  }

  // Pegar un enlace (foto/vídeo ya alojado fuera, o contenido incrustado).
  const addByUrl = async (target: Target, kind: 'embed' | 'url', url: string): Promise<string | null> => {
    const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)
    const type: MediaKind = kind === 'embed' ? 'embed' : isVideo ? 'video' : 'image'
    const res = await call<{ items: MediaItem[] }>('/api/media', 'POST', password, {
      action: 'add',
      item: {
        title: '',
        url,
        category: target.category,
        type,
        ...(target.albumId ? { albumId: target.albumId } : {}),
      },
    })
    if (!res.ok) return res.error
    setMedia(res.data.items)
    return null
  }

  // Cambia la portada de la tarjeta: sube la nueva y quita las anteriores (solo vale la última).
  const changeCover = async (slug: string, file: File) => {
    setErrors([])
    if (!file.type.startsWith('image/')) {
      addError(`"${file.name}" no es una foto. La portada tiene que ser una imagen.`)
      return
    }
    const problem = checkFile(file, 'normal')
    if (problem) {
      addError(problem)
      return
    }
    const category = `cover-${slug}`
    const previous = media.filter((m) => m.category === category).map((m) => m.id)
    const key = category
    setUpload({ key, label: '', percent: 0 })
    try {
      const result = await uploadToCloudinaryDetailed(file, 'image', (percent) =>
        setUpload((u) => (u ? { ...u, percent } : u)),
      )
      const ok = await addMedia({ title: 'Portada', url: result.url, category, type: 'image' })
      if (ok) for (const id of previous) await removeMedia(id)
    } catch (e) {
      addError(e instanceof Error ? e.message : 'No se pudo subir la portada.')
    }
    setUpload(null)
  }

  // ----- confirmaciones de borrado -----
  const askDeleteMedia = (item: MediaItem) =>
    setConfirm({
      title: '¿Eliminar este elemento?',
      text: `Se eliminará ${kindOf(item) === 'video' ? 'este vídeo' : 'este elemento'} de la web. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      run: async () => {
        await removeMedia(item.id)
      },
    })

  const askDeleteAlbum = (album: AlbumItem) => {
    const count = media.filter((m) => m.albumId === album.id).length
    setConfirm({
      title: `¿Eliminar el álbum «${album.title}»?`,
      text:
        count > 0
          ? `También se eliminarán las ${count} foto(s) y vídeo(s) que tiene dentro. Esta acción no se puede deshacer.`
          : 'El álbum está vacío. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar álbum',
      run: async () => {
        await removeAlbum(album.id)
      },
    })
  }

  // ----- pantalla -----
  const mediaOf = (category: string) => media.filter((m) => m.category === category)
  // Solo las fotos se describen (los vídeos y modelos 3D no llevan texto alternativo).
  const describable = (item: MediaItem) => kindOf(item) === 'image' || kindOf(item) === 'panorama'
  const coverOf = (slug: string) => {
    const covers = mediaOf(`cover-${slug}`)
    return covers[covers.length - 1] ?? null
  }

  const dialogs = (
    <>
      {altItem && (
        <AltDialog
          item={altItem}
          onClose={() => setAltItem(null)}
          onSave={(alt, altEn) => saveAlt(altItem.id, alt, altEn)}
        />
      )}
      {confirm && <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />}
      {special && (
        <SpecialDialog
          onClose={() => setSpecial(null)}
          onFile={(kind, file) => void runUpload([file], special, kind)}
          onUrl={(kind, url) => addByUrl(special, kind, url)}
        />
      )}
      {showNewCategory && (
        <Modal title="Nueva categoría" onClose={() => setShowNewCategory(false)} wide>
          <CategoryForm
            initial={{
              title: EMPTY_LOCALIZED,
              short: EMPTY_LOCALIZED,
              description: EMPTY_LOCALIZED,
              includes: EMPTY_LOCALIZED,
              price: EMPTY_LOCALIZED,
            }}
            submitLabel="Crear categoría"
            onSubmit={createCategory}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Después podrás subir su portada y sus fotos y vídeos entrando en ella.
          </p>
        </Modal>
      )}
    </>
  )

  const errorBanner = errors.length > 0 && (
    <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          {errors.map((e) => (
            <p key={e} className="text-sm text-destructive">
              {e}
            </p>
          ))}
        </div>
        <button type="button" onClick={() => setErrors([])} aria-label="Cerrar aviso" className="shrink-0 rounded p-0.5">
          <X className="h-4 w-4 text-destructive" />
        </button>
      </div>
    </div>
  )

  // ===== Vista 2a: carrusel de inicio =====
  if (openSlug === HERO) {
    const items = mediaOf(HERO)
    const target: Target = { category: HERO }
    return (
      <div ref={topRef} className="mt-10 scroll-mt-4">
        <button type="button" onClick={() => setOpenSlug(null)} className={secondaryButton}>
          <ArrowLeft className="h-4 w-4" /> Volver a categorías
        </button>
        <h2 className="mt-4 text-xl font-bold">Carrusel de inicio</h2>
        <p className="text-sm text-muted-foreground">
          Los vídeos que se ven al abrir la web, uno detrás de otro. Solo se admiten vídeos.
        </p>
        {errorBanner}
        <Section title="Vídeos del carrusel" subtitle={`${items.length}`}>
          {items.map((item) => (
            <MediaTile key={item.id} item={item} onDelete={() => askDeleteMedia(item)} />
          ))}
          <AddTile
            accept="video/*"
            multiple
            upload={upload}
            uploadKey={targetKey(target)}
            onFiles={(files) => void runUpload(files, target)}
          />
        </Section>
        {dialogs}
      </div>
    )
  }

  // ===== Vista 2b: una categoría =====
  const openCategory = categories.find((c) => c.slug === openSlug)
  if (openCategory) {
    const slug = openCategory.slug
    const items = mediaOf(slug)
    const loose = items.filter((m) => !m.albumId)
    const catAlbums = albums.filter((a) => a.category === slug)
    const cover = coverOf(slug)
    const visible = openCategory.visible !== false
    const generalTarget: Target = { category: slug }

    return (
      <div ref={topRef} className="mt-10 scroll-mt-4">
        <button type="button" onClick={() => { setOpenSlug(null); setShowTexts(false); setErrors([]) }} className={secondaryButton}>
          <ArrowLeft className="h-4 w-4" /> Volver a categorías
        </button>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold">{openCategory.title.es}</h2>
            <p className="text-sm text-muted-foreground">
              {openCategory.price.es || 'Sin precio'} · /servicios/{slug}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={visible}
                onChange={() => void setCategoryVisible(slug, !visible)}
                className="h-4 w-4 rounded border-input accent-[var(--gold)]"
              />
              Visible en la web
            </label>
            <button type="button" onClick={() => setShowTexts((v) => !v)} className={secondaryButton}>
              <Pencil className="h-4 w-4" />
              {showTexts ? 'Cerrar textos' : 'Editar textos'}
            </button>
          </div>
        </div>

        {errorBanner}

        {showTexts && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-4 text-base font-bold">Textos de la categoría</h3>
            <CategoryForm
              initial={{
                title: openCategory.title,
                short: openCategory.short,
                description: openCategory.description,
                includes: {
                  es: openCategory.includes?.es.join('\n') ?? '',
                  en: openCategory.includes?.en.join('\n') ?? '',
                },
                price: openCategory.price,
              }}
              submitLabel="Guardar textos"
              onSubmit={(texts) => saveCategoryTexts(slug, texts)}
            />
          </div>
        )}

        {/* Portada de la tarjeta */}
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4">
          <div className="h-24 w-36 shrink-0 overflow-hidden rounded-lg border border-border">
            <Thumb src={cover ? thumbnailOf(cover) : openCategory.image || null} kind="image" alt="Portada" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Portada de la tarjeta</p>
            <p className="text-xs text-muted-foreground">
              La foto que se ve en la portada de la web para esta categoría.
            </p>
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void changeCover(slug, file)
            }}
          />
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={!!upload}
            className={secondaryButton}
          >
            {upload?.key === `cover-${slug}` ? `Subiendo... ${upload.percent}%` : 'Cambiar portada'}
          </button>
        </div>

        {/* Fotos y vídeos sueltos de la categoría */}
        <Section
          title="General"
          subtitle={`${loose.length} · sin álbum`}
          actions={
            <button type="button" onClick={() => setSpecial(generalTarget)} className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-gold hover:underline">
              Foto 360°, modelo 3D o enlace…
            </button>
          }
        >
          {loose.map((item) => (
            <MediaTile
              key={item.id}
              item={item}
              onDelete={() => askDeleteMedia(item)}
              onEdit={describable(item) ? () => setAltItem(item) : undefined}
            />
          ))}
          <AddTile
            accept="image/*,video/*"
            multiple
            upload={upload}
            uploadKey={targetKey(generalTarget)}
            onFiles={(files) => void runUpload(files, generalTarget)}
          />
        </Section>

        {/* Álbumes */}
        {catAlbums.map((album) => {
          const albumItems = items.filter((m) => m.albumId === album.id)
          const target: Target = { category: slug, albumId: album.id }
          return (
            <Section
              key={album.id}
              title={album.title}
              subtitle={`${albumItems.length} · álbum`}
              actions={
                <>
                  <button type="button" onClick={() => setSpecial(target)} className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-gold hover:underline">
                    Foto 360°, modelo 3D o enlace…
                  </button>
                  <button
                    type="button"
                    onClick={() => askDeleteAlbum(album)}
                    className="rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
                  >
                    Eliminar álbum
                  </button>
                </>
              }
            >
              {albumItems.map((item) => (
                <MediaTile
                  key={item.id}
                  item={item}
                  onDelete={() => askDeleteMedia(item)}
                  onEdit={describable(item) ? () => setAltItem(item) : undefined}
                />
              ))}
              <AddTile
                accept="image/*,video/*"
                multiple
                upload={upload}
                uploadKey={targetKey(target)}
                onFiles={(files) => void runUpload(files, target)}
              />
            </Section>
          )
        })}

        {/* Nuevo álbum */}
        <form
          className="mt-8 flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault()
            void createAlbum(slug)
          }}
        >
          <input
            value={newAlbumTitle}
            onChange={(e) => setNewAlbumTitle(e.target.value)}
            placeholder="Nombre del nuevo álbum (ej. Boda García-Pérez)"
            maxLength={120}
            className={`${inputClass} sm:flex-1`}
          />
          <button type="submit" disabled={!newAlbumTitle.trim() || creatingAlbum} className={primaryButton}>
            <Plus className="h-4 w-4" />
            {creatingAlbum ? 'Creando...' : 'Crear álbum'}
          </button>
        </form>

        {dialogs}
      </div>
    )
  }

  // ===== Vista 1: cuadrícula de categorías =====
  const heroItems = mediaOf(HERO)
  const heroFirst = heroItems[0]

  return (
    <div ref={topRef} className="mt-10 scroll-mt-4">
      <h2 className="text-xl font-bold">Categorías, fotos y vídeos</h2>
      <p className="text-sm text-muted-foreground">
        Entra en una categoría para ver su contenido, añadir fotos y vídeos o eliminarlos. También puedes
        cambiar sus textos y su portada.
      </p>
      {loadError && (
        <div className="mt-3">
          <Message tone="error">{loadError}</Message>
        </div>
      )}
      {errorBanner}

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Carrusel de inicio */}
          <button
            type="button"
            onClick={() => setOpenSlug(HERO)}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:-translate-y-0.5 hover:border-[var(--gold)]"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Thumb src={heroFirst ? thumbnailOf(heroFirst) : null} kind="video" alt="Carrusel de inicio" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <span className="absolute bottom-3 left-3 rounded-full bg-[var(--gold)] px-3 py-1 text-xs font-bold text-[var(--gold-foreground)]">
                Inicio
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-bold">Carrusel de inicio</h3>
              <p className="mt-1 text-xs text-muted-foreground">{heroItems.length} vídeo(s)</p>
            </div>
          </button>

          {categories.map((cat) => {
            const cover = coverOf(cat.slug)
            const count = mediaOf(cat.slug).length
            const albumCount = albums.filter((a) => a.category === cat.slug).length
            const visible = cat.visible !== false
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => setOpenSlug(cat.slug)}
                className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:-translate-y-0.5 hover:border-[var(--gold)] ${
                  visible ? '' : 'opacity-60'
                }`}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Thumb src={cover ? thumbnailOf(cover) : cat.image || null} kind="image" alt={cat.title.es} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  {cat.price.es && (
                    <span className="absolute bottom-3 left-3 rounded-full bg-[var(--gold)] px-3 py-1 text-xs font-bold text-[var(--gold-foreground)]">
                      {cat.price.es}
                    </span>
                  )}
                  {!visible && (
                    <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
                      Oculta
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold leading-snug">{cat.title.es}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {count} foto(s) y vídeo(s) · {albumCount} álbum(es)
                  </p>
                </div>
              </button>
            )
          })}

          {/* Nueva categoría */}
          <button
            type="button"
            onClick={() => setShowNewCategory(true)}
            className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-center transition hover:border-[var(--gold)] hover:text-gold"
          >
            <Plus className="h-8 w-8" />
            <span className="text-sm font-semibold">Nueva categoría</span>
          </button>
        </div>
      )}

      {dialogs}
    </div>
  )
}
