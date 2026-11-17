'use client'

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Box,
  ChevronLeft,
  ChevronRight,
  Film,
  Folder,
  Globe,
  GripVertical,
  ImageIcon,
  Link2,
  Pencil,
  Play,
  Plus,
  X,
} from 'lucide-react'
import {
  CATEGORIES,
  DEFAULT_INCLUDE_KEYS,
  translate,
  type Category,
  type Localized,
} from '@/lib/content'
import { uploadToCloudinaryDetailed } from '@/lib/cloudinary'
import { CloudinaryAccounts, CloudinaryTarget, useUploadTarget } from '@/components/cloudinary-target'
import { MOBILE_VIDEO_WIDTH, isAllowedEmbed, playableVideoUrl } from '@/lib/media-url'
import { detectFile, detectLink } from '@/lib/media-detect'
import { SHOWCASE_CATEGORY, SHOWCASE_LIMITS, SHOWCASE_MAX_ITEMS } from '@/lib/showcase'
import { AutoSaveStatus, useAutoSave } from '@/lib/use-autosave'
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
const SHOWCASE = SHOWCASE_CATEGORY // carrusel de la sección «oportunidad» (debajo del descuento)

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
  keepalive = false, // permite terminar de guardar aunque se cierre la ventana
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify(body),
      keepalive,
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: data?.error || 'No se pudo completar la acción.' }
    return { ok: true, data: data as T }
  } catch {
    return { ok: false, error: 'Error de conexión. Inténtalo de nuevo.' }
  }
}

const targetKey = (t: Target) => `${t.category}:${t.albumId ?? ''}`

// Los recuadros «Añadir» de categorías y álbumes aceptan de todo: el detector decide el tipo (lib/media-detect.ts).
const AUTO_ACCEPT = 'image/*,video/*,.glb,model/gltf-binary'
const AUTO_HINT = 'Suelta fotos, vídeos, 360° o .glb: se detecta solo'

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

// Reproductor del admin: abre el vídeo en una ventana para comprobarlo (también en el móvil).
// Pide la copia H.264 reducida (la misma que ve un visitante en móvil) y, si no carga, prueba con el original.
function VideoPreview({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const [src, setSrc] = useState(() => playableVideoUrl(item.url, MOBILE_VIDEO_WIDTH))
  const [failed, setFailed] = useState(false)
  return (
    <Modal title={item.title || 'Vídeo'} onClose={onClose} wide>
      {failed ? (
        <div className="space-y-3 text-sm">
          <p className="text-destructive">Este navegador no ha podido reproducir el vídeo.</p>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-lg border border-border px-3.5 py-2 font-semibold hover:bg-muted"
          >
            Abrir el vídeo original
          </a>
        </div>
      ) : (
        <video
          key={src}
          src={src}
          poster={thumbnailOf(item) ?? undefined}
          controls
          autoPlay
          muted
          playsInline
          preload="metadata"
          onError={() => {
            if (src !== item.url) setSrc(item.url)
            else setFailed(true)
          }}
          className="max-h-[70vh] w-full rounded-lg bg-black"
        />
      )}
    </Modal>
  )
}

// Una foto o vídeo con su miniatura. Al pasar el ratón aparece el cuadradito para eliminarlo
// (en el móvil, que no tiene ratón, se ve siempre).
function MediaTile({
  item,
  onDelete,
  onEdit,
  onToggle360,
}: {
  item: MediaItem
  onDelete: () => void
  onEdit?: () => void // abre la descripción de la foto (solo para fotos)
  onToggle360?: () => void // corrige el tipo: foto normal <-> foto 360° (solo fotos)
}) {
  const kind = kindOf(item)
  const missingAlt = !!onEdit && !item.alt
  const [playing, setPlaying] = useState(false)
  return (
    <div
      className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted"
      title={item.title || kindLabel(kind)}
    >
      <Thumb src={thumbnailOf(item)} kind={kind} alt={item.title || kindLabel(kind)} />
      {kind === 'video' && (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label="Reproducir vídeo"
          title="Reproducir"
          className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/20 focus-visible:bg-black/20"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/65 text-white shadow-lg">
            <Play className="h-5 w-5 fill-current" />
          </span>
        </button>
      )}
      {playing && <VideoPreview item={item} onClose={() => setPlaying(false)} />}
      {kind === 'panorama' &&
        (onToggle360 ? (
          <button
            type="button"
            onClick={onToggle360}
            title="Es una foto 360°. Pulsa para tratarla como foto normal"
            aria-label="Quitar el tipo 360°: tratar como foto normal"
            className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white transition hover:bg-[var(--gold)] hover:text-[var(--gold-foreground)] focus-visible:bg-[var(--gold)] focus-visible:text-[var(--gold-foreground)]"
          >
            360°
          </button>
        ) : (
          <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
            360°
          </span>
        ))}
      {kind === 'image' && onToggle360 && (
        <button
          type="button"
          onClick={onToggle360}
          title="Marcar como foto 360° (esférica 2:1)"
          aria-label="Marcar como foto 360°"
          className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 transition hover:bg-[var(--gold)] hover:text-[var(--gold-foreground)] focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
        >
          ¿360°?
        </button>
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

// Ventana para escribir el pie de una foto o vídeo del carrusel de la sección «oportunidad»
// (el texto que sale sobre la imagen, por ejemplo «Tu viaje, desde el aire»).
function CaptionDialog({
  item,
  onClose,
  onSave,
}: {
  item: MediaItem
  onClose: () => void
  onSave: (caption: string, captionEn: string) => Promise<string | null>
}) {
  const [caption, setCaption] = useState(item.caption ?? '')
  const [captionEn, setCaptionEn] = useState(item.captionEn ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  return (
    <Modal title="Texto sobre la imagen" onClose={onClose}>
      <div className="mb-4 h-32 w-48 overflow-hidden rounded-lg border border-border">
        <Thumb src={thumbnailOf(item)} kind={kindOf(item)} alt="" />
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Es una frase corta que se ve en la parte de abajo de la imagen dentro del carrusel (por ejemplo «Presume de
        viaje» o «Enseña tu casa»). También la leen los lectores de pantalla y Google. Déjala en blanco para que
        la imagen salga sin texto.
      </p>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setSaving(true)
          setError('')
          const problem = await onSave(caption, captionEn)
          setSaving(false)
          if (problem) setError(problem)
          else onClose()
        }}
      >
        <div>
          <label className="mb-1 flex justify-between text-xs font-medium">
            <span>Texto en español</span>
            <span className="text-muted-foreground">
              {caption.length}/{SHOWCASE_LIMITS.caption}
            </span>
          </label>
          <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={SHOWCASE_LIMITS.caption} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 flex justify-between text-xs font-medium">
            <span>Texto en inglés (opcional)</span>
            <span className="text-muted-foreground">
              {captionEn.length}/{SHOWCASE_LIMITS.caption}
            </span>
          </label>
          <input value={captionEn} onChange={(e) => setCaptionEn(e.target.value)} maxLength={SHOWCASE_LIMITS.caption} className={inputClass} />
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
  onLinks,
  hint,
}: {
  accept: string
  multiple: boolean
  upload: UploadState | null
  uploadKey: string
  onFiles: (files: File[]) => void
  onLinks?: (urls: string[]) => void // enlaces soltados en lugar de archivos
  hint?: string // texto pequeño bajo «Añadir»
}) {
  const [dragOver, setDragOver] = useState(false)
  const target = useUploadTarget()
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
        if (upload) return
        const files = Array.from(e.dataTransfer.files ?? [])
        if (files.length > 0) {
          onFiles(files)
          return
        }
        // Sin archivos: puede ser un enlace arrastrado desde otra pestaña.
        if (onLinks) {
          const urls = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain'))
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#'))
          if (urls.length > 0) onLinks(urls)
        }
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
          <span className="text-xs text-muted-foreground">
            {upload?.percent}%{target ? ` · Cloudinary ${target.number}` : ''}
          </span>
        </>
      ) : (
        <>
          <Plus className="h-7 w-7" />
          <span className="text-sm font-semibold">Añadir</span>
          {hint && <span className="px-2 text-[11px] leading-tight text-muted-foreground">{hint}</span>}
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
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
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
  includes: Localized // los puntos propios de «qué incluye», una línea por punto
  defaultIncludes: string[] // los puntos «de siempre» que se muestran (casillas)
  price: Localized
}

function CategoryForm({
  initial,
  submitLabel,
  onSubmit,
  autosave = false,
}: {
  initial: CategoryTexts
  submitLabel: string
  onSubmit: (texts: CategoryTexts, opts?: { keepalive: boolean }) => Promise<string | null> // devuelve un error, o null si fue bien
  // true = sin botón: se guarda solo al editar, al cerrar la ventana y al salir (categorías ya creadas).
  autosave?: boolean
}) {
  const [t, setT] = useState<CategoryTexts>(initial)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const set = (field: 'title' | 'short' | 'description' | 'includes' | 'price', lang: 'es' | 'en', value: string) =>
    setT((prev) => ({ ...prev, [field]: { ...prev[field], [lang]: value } }))

  const auto = useAutoSave({
    value: t,
    enabled: autosave,
    save: async (texts, { keepalive }) => {
      if (!texts.title.es.trim()) return 'Ponle al menos un título en español. No se guarda hasta que lo tenga.'
      return onSubmit(texts, { keepalive })
    },
  })

  const toggleDefault = (key: string) =>
    setT((prev) => ({
      ...prev,
      defaultIncludes: prev.defaultIncludes.includes(key)
        ? prev.defaultIncludes.filter((k) => k !== key)
        : [...prev.defaultIncludes, key],
    }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (autosave) {
      void auto.flush() // Intro dentro de un campo: guarda ya
      return
    }
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
              <label className="mb-1 block text-xs font-medium">Puntos propios de esta categoría (una línea por punto, máximo 10)</label>
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
                Opcional. Se añaden después de los puntos de siempre que marques más abajo.
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

      <fieldset className="rounded-xl border border-border p-4">
        <legend className="px-2 text-xs font-semibold">Puntos «de siempre» con tick en esta categoría</legend>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Son los mismos de «Incluido en el precio» (sección Cobertura). Marca los que quieres que se vean
          en esta categoría y desmarca los que no, por ejemplo para que no se repitan.
        </p>
        <div className="space-y-2">
          {DEFAULT_INCLUDE_KEYS.map((key) => (
            <label key={key} className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={t.defaultIncludes.includes(key)}
                onChange={() => toggleDefault(key)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-[var(--gold)]"
              />
              <span>{translate(key, 'es')}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        {autosave ? (
          <AutoSaveStatus status={auto.status} error={auto.error} />
        ) : (
          <>
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? 'Guardando...' : submitLabel}
            </button>
            {message && <Message tone={message.ok ? 'ok' : 'error'}>{message.text}</Message>}
          </>
        )}
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
// `only` permite colocar el carrusel de inicio y las categorías en sitios distintos del admin.
export function MediaManager({
  password,
  only,
}: {
  password: string
  only?: 'hero' | 'categories' | 'showcase'
}) {
  const [categories, setCategories] = useState<Category[]>(CATEGORIES)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [albums, setAlbums] = useState<AlbumItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [openSlug, setOpenSlug] = useState<string | null>(null) // null = lista; 'hero' = carrusel
  const [errors, setErrors] = useState<string[]>([])
  const [notes, setNotes] = useState<string[]>([]) // avisos de lo que ha detectado el detector automático
  const [upload, setUpload] = useState<UploadState | null>(null)

  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [special, setSpecial] = useState<Target | null>(null)
  const [altItem, setAltItem] = useState<MediaItem | null>(null)
  const [captionItem, setCaptionItem] = useState<MediaItem | null>(null)
  // Orden del carrusel: qué toma se está arrastrando y sobre cuál está (solo mientras se arrastra).
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const dragRef = useRef<string | null>(null)
  const overRef = useRef<string | null>(null)
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

  // Pie de foto del carrusel de la sección «oportunidad».
  const saveCaption = async (id: string, caption: string, captionEn: string): Promise<string | null> => {
    const res = await call<{ items: MediaItem[] }>('/api/media', 'POST', password, {
      action: 'update',
      id,
      caption,
      captionEn,
    })
    if (!res.ok) return res.error
    setMedia(res.data.items)
    return null
  }

  // Categoría a la que lleva el botón de un vídeo del carrusel ('' = sin botón).
  const saveLink = async (id: string, linkSlug: string) => {
    const res = await call<{ items: MediaItem[] }>('/api/media', 'POST', password, { action: 'update', id, linkSlug })
    if (!res.ok) {
      addError(res.error)
      return
    }
    setMedia(res.data.items)
  }

  // Orden de las tomas del carrusel: es el orden en que se reproducen en la web.
  const saveHeroOrder = async (ids: string[], category: string = HERO) => {
    const res = await call<{ items: MediaItem[] }>('/api/media', 'POST', password, {
      action: 'reorder',
      category,
      ids,
    })
    if (!res.ok) {
      addError(res.error)
      void loadAll()
      return
    }
    setMedia(res.data.items)
  }

  // Coloca la toma `id` en el puesto de la toma `targetId` (se ve al instante y se guarda en el servidor).
  const moveHero = (id: string, targetId: string, category: string = HERO) => {
    const ids = media.filter((m) => m.category === category).map((m) => m.id)
    const from = ids.indexOf(id)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0 || from === to) return
    const next = [...ids]
    next.splice(from, 1)
    next.splice(to, 0, id)
    setMedia((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]))
      const reordered = next.map((i) => byId.get(i)).filter((m): m is MediaItem => !!m)
      let k = 0
      return prev.map((m) => (m.category === category ? reordered[k++] ?? m : m))
    })
    void saveHeroOrder(next, category)
  }

  const endDrag = (drop: boolean) => {
    const from = dragRef.current
    const to = overRef.current
    dragRef.current = null
    overRef.current = null
    setDragId(null)
    setOverId(null)
    if (drop && from && to && from !== to) moveHero(from, to, openSlug === SHOWCASE ? SHOWCASE : HERO)
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

  const saveCategoryTexts = async (slug: string, texts: CategoryTexts, keepalive = false): Promise<string | null> => {
    const res = await call<{ categories: Category[] }>(
      '/api/categories',
      'POST',
      password,
      {
        action: 'update',
        slug,
        category: texts,
      },
      keepalive,
    )
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

  // Cambia el orden de las categorías: 'before' = un puesto antes (a la izquierda), 'after' = un puesto después.
  // Es el orden en que salen en la portada, en el formulario de presupuesto y aquí.
  const moveCategory = async (slug: string, direction: 'before' | 'after') => {
    setCategories((prev) => {
      const from = prev.findIndex((c) => c.slug === slug)
      const to = direction === 'before' ? from - 1 : from + 1
      if (from < 0 || to < 0 || to >= prev.length) return prev
      const next = [...prev]
      ;[next[from], next[to]] = [next[to], next[from]] // se ve al instante
      return next
    })
    const res = await call<{ categories: Category[] }>('/api/categories', 'POST', password, {
      action: 'move',
      slug,
      direction,
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
  // Sin `kind`, el detector automático decide si cada archivo es foto, vídeo, foto 360° o modelo 3D.
  // Con `kind` (lo elegido a mano en «Foto 360°, modelo 3D o enlace…») se respeta tal cual.
  const runUpload = async (files: File[], target: Target, forcedKind?: UploadKind) => {
    if (files.length === 0) return
    setErrors([])
    setNotes([])
    const key = targetKey(target)
    // Los carruseles solo admiten fotos y vídeos normales (una foto 360° o un .glb no tienen sitio ahí).
    const onlyPlain = target.category === HERO || target.category === SHOWCASE
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const label = files.length > 1 ? `${i + 1} de ${files.length}` : ''

      let kind: UploadKind = forcedKind ?? 'normal'
      let note = ''
      if (!forcedKind) {
        const found = await detectFile(file)
        if (!found.ok) {
          addError(found.error)
          continue
        }
        kind = found.kind
        if (onlyPlain && kind === 'model3d') {
          addError(`"${file.name}" es un modelo 3D y este carrusel solo admite fotos y vídeos.`)
          continue
        }
        // En un carrusel, una foto 360° se trata como foto normal.
        if (onlyPlain && kind === 'panorama') kind = 'normal'
        else if (found.kind !== 'normal' || found.confidence === 'medium') {
          const dudoso = found.confidence === 'medium' ? ' Si no es 360°, pulsa «360°» en su miniatura para quitarlo.' : ''
          note = `«${file.name}» se ha subido como ${found.label} (${found.reason}).${dudoso}`
        }
      }

      if (target.category === HERO && !file.type.startsWith('video/')) {
        addError(`"${file.name}" no es un vídeo. El carrusel de inicio solo usa vídeos.`)
        continue
      }
      const problem = checkFile(file, kind)
      if (problem) {
        addError(problem)
        continue
      }
      if (note) setNotes((prev) => [...prev, note])

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

  // Enlaces soltados sobre «Añadir» (por ejemplo, arrastrar una pestaña de Sketchfab): se detecta el tipo de cada uno.
  const runLinks = async (urls: string[], target: Target) => {
    setErrors([])
    setNotes([])
    const onlyPlain = target.category === HERO || target.category === SHOWCASE
    for (const raw of urls) {
      const found = detectLink(raw, isAllowedEmbed)
      if (!found) {
        addError(`El enlace «${raw}» no vale: debe empezar por https:// y ser de Sketchfab, Kuula, Matterport o una foto/vídeo.`)
        continue
      }
      if (onlyPlain && found.kind === 'embed') {
        addError('Este carrusel solo admite fotos y vídeos, no enlaces incrustados.')
        continue
      }
      const problem = await addByUrl(target, found.kind, found.url)
      if (problem) addError(problem)
      else setNotes((prev) => [...prev, `Enlace añadido como ${found.label}.`])
    }
  }

  // Corrige lo que decidió el detector: una foto normal pasa a 360° o al revés.
  const toggle360 = async (item: MediaItem) => {
    const type = kindOf(item) === 'panorama' ? 'image' : 'panorama'
    const res = await call<{ items: MediaItem[] }>('/api/media', 'POST', password, { action: 'retype', id: item.id, type })
    if (!res.ok) {
      addError(res.error)
      return
    }
    setMedia(res.data.items)
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
      {captionItem && (
        <CaptionDialog
          item={captionItem}
          onClose={() => setCaptionItem(null)}
          onSave={(caption, captionEn) => saveCaption(captionItem.id, caption, captionEn)}
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
              defaultIncludes: [],
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

  const errorBanner = (errors.length > 0 || notes.length > 0) && (
    <div className="mt-4 space-y-2">
      {errors.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3">
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
      )}
      {notes.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              {notes.map((n) => (
                <p key={n} className="text-sm text-muted-foreground">
                  {n}
                </p>
              ))}
            </div>
            <button type="button" onClick={() => setNotes([])} aria-label="Cerrar aviso" className="shrink-0 rounded p-0.5">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // ===== Vista 2a: carrusel de inicio =====
  if (openSlug === HERO || openSlug === SHOWCASE) {
    const isShowcase = openSlug === SHOWCASE
    const carouselCategory = isShowcase ? SHOWCASE : HERO
    const items = mediaOf(carouselCategory)
    const target: Target = { category: carouselCategory }
    return (
      <div ref={topRef} className="mt-10 scroll-mt-4">
        <button type="button" onClick={() => setOpenSlug(null)} className={secondaryButton}>
          <ArrowLeft className="h-4 w-4" /> {only === 'hero' || only === 'showcase' ? 'Volver' : 'Volver a categorías'}
        </button>
        <h2 className="mt-4 text-xl font-bold">{isShowcase ? 'Carrusel de la sección de oportunidad' : 'Carrusel de inicio'}</h2>
        {isShowcase ? (
          <p className="text-sm text-muted-foreground">
            Las fotos (y vídeos, si quieres) que se ven en el carrusel pequeño de la sección, una detrás de otra.
            Máximo {SHOWCASE_MAX_ITEMS}. Debajo de cada una puedes escribir el texto que sale sobre la imagen. Si
            solo vas a poner fotos, no hace falta nada más: pesan mucho menos que un vídeo.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Los vídeos que se ven al abrir la web, uno detrás de otro. Solo se admiten vídeos.
            <br />
            Debajo de cada vídeo elige a qué categoría lleva el botón que sale en el carrusel («Ver Inmobiliaria»,
            etc.). Si lo dejas en «Sin botón», ese vídeo sale sin enlace.
          </p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="text-foreground">Orden:</span> el número es el orden en que se ven. Para cambiarlo,
          mantén pulsado el icono <GripVertical className="inline h-3.5 w-3.5 align-text-bottom" /> de un vídeo y
          arrástralo sobre el puesto donde quieres ponerlo (o usa las flechas). Toca el vídeo para reproducirlo.
        </p>
        {errorBanner}
        <Section
          title={isShowcase ? 'Fotos y vídeos del carrusel' : 'Vídeos del carrusel'}
          subtitle={isShowcase ? `${items.length} / ${SHOWCASE_MAX_ITEMS}` : `${items.length}`}
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              data-hero-id={item.id}
              className={`space-y-1.5 rounded-xl transition ${
                dragId === item.id ? 'opacity-40' : ''
              } ${dragId && overId === item.id && dragId !== item.id ? 'ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-background' : ''}`}
            >
              <MediaTile item={item} onDelete={() => askDeleteMedia(item)} />
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  aria-label={`Arrastrar para cambiar el orden (puesto ${index + 1})`}
                  title="Mantén pulsado y arrastra"
                  onPointerDown={(e) => {
                    if (e.pointerType === 'mouse' && e.button !== 0) return
                    e.currentTarget.setPointerCapture(e.pointerId)
                    dragRef.current = item.id
                    overRef.current = null
                    setDragId(item.id)
                  }}
                  onPointerMove={(e) => {
                    if (dragRef.current !== item.id) return
                    const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest(
                      '[data-hero-id]',
                    ) as HTMLElement | null
                    const over = el?.dataset.heroId ?? null
                    if (over !== overRef.current) {
                      overRef.current = over
                      setOverId(over)
                    }
                    // Cerca del borde de la pantalla, la página se desplaza sola.
                    if (e.clientY < 90) window.scrollBy({ top: -14, behavior: 'instant' })
                    else if (e.clientY > window.innerHeight - 90) window.scrollBy({ top: 14, behavior: 'instant' })
                  }}
                  onPointerUp={() => endDrag(true)}
                  onPointerCancel={() => endDrag(false)}
                  className="flex h-8 w-9 cursor-grab touch-none select-none items-center justify-center gap-0.5 rounded-lg border border-border bg-background text-muted-foreground transition hover:text-gold active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <span className="flex-1 text-center text-xs font-bold tabular-nums text-muted-foreground">
                  {index + 1} / {items.length}
                </span>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveHero(item.id, items[index - 1].id, carouselCategory)}
                  aria-label="Subir un puesto (antes)"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition hover:bg-muted disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={index === items.length - 1}
                  onClick={() => moveHero(item.id, items[index + 1].id, carouselCategory)}
                  aria-label="Bajar un puesto (después)"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition hover:bg-muted disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              {isShowcase ? (
                <button
                  type="button"
                  onClick={() => setCaptionItem(item)}
                  title="Escribir el texto que sale sobre la imagen"
                  className="flex w-full items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5 text-left text-xs transition hover:border-[var(--gold)]"
                >
                  <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className={`min-w-0 flex-1 truncate ${item.caption ? '' : 'text-muted-foreground'}`}>
                    {item.caption || 'Añadir texto sobre la imagen'}
                  </span>
                </button>
              ) : (
                <select
                  value={item.linkSlug ?? ''}
                  onChange={(e) => void saveLink(item.id, e.target.value)}
                  aria-label="Categoría a la que lleva el botón de este vídeo"
                  className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none focus:border-[var(--gold)]"
                >
                  <option value="">Sin botón</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title.es}
                      {c.visible === false ? ' (oculta)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
          <AddTile
            accept={isShowcase ? 'image/*,video/*' : 'video/*'}
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
        <button type="button" onClick={() => { setOpenSlug(null); setShowTexts(false); setErrors([]); setNotes([]) }} className={secondaryButton}>
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
                defaultIncludes: openCategory.defaultIncludes ?? [],
                price: openCategory.price,
              }}
              submitLabel="Guardar textos"
              autosave
              onSubmit={(texts, opts) => saveCategoryTexts(slug, texts, opts?.keepalive)}
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
              onToggle360={describable(item) ? () => void toggle360(item) : undefined}
            />
          ))}
          <AddTile
            accept={AUTO_ACCEPT}
            multiple
            upload={upload}
            uploadKey={targetKey(generalTarget)}
            onFiles={(files) => void runUpload(files, generalTarget)}
            onLinks={(urls) => void runLinks(urls, generalTarget)}
            hint={AUTO_HINT}
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
                  onToggle360={describable(item) ? () => void toggle360(item) : undefined}
                />
              ))}
              <AddTile
                accept={AUTO_ACCEPT}
                multiple
                upload={upload}
                uploadKey={targetKey(target)}
                onFiles={(files) => void runUpload(files, target)}
                onLinks={(urls) => void runLinks(urls, target)}
                hint={AUTO_HINT}
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
      {only === 'showcase' ? (
        <>
          <h2 className="text-xl font-bold">Carrusel de la sección de oportunidad</h2>
          <p className="text-sm text-muted-foreground">
            Las fotos (y vídeos, si quieres) del carrusel pequeño que sale en la sección de debajo del descuento.
          </p>
        </>
      ) : only === 'hero' ? (
        <>
          <h2 className="text-xl font-bold">Vídeos del carrusel</h2>
          <p className="text-sm text-muted-foreground">
            Los vídeos que se ven al abrir la web, uno detrás de otro.
          </p>
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold">Categorías, fotos y vídeos</h2>
          <p className="text-sm text-muted-foreground">
            Entra en una categoría para ver su contenido, añadir fotos y vídeos o eliminarlos. También puedes
            cambiar sus textos y su portada.
          </p>
        </>
      )}
      <div className="mt-1">
        {/* Cuadro con créditos y selector de cuenta en Inicio y Servicios (donde se suben los vídeos pesados);
            en el carrusel pequeño de oportunidad, solo una línea con la cuenta activa. */}
        {only === 'showcase' ? <CloudinaryTarget /> : <CloudinaryAccounts password={password} />}
      </div>
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
          {only !== 'categories' && only !== 'showcase' && (
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
          )}

          {/* Carrusel de la sección «oportunidad» */}
          {only === 'showcase' && (
            <button
              type="button"
              onClick={() => setOpenSlug(SHOWCASE)}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:-translate-y-0.5 hover:border-[var(--gold)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Thumb
                  src={mediaOf(SHOWCASE)[0] ? thumbnailOf(mediaOf(SHOWCASE)[0]) : null}
                  kind="image"
                  alt="Carrusel de la sección de oportunidad"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-full bg-[var(--gold)] px-3 py-1 text-xs font-bold text-[var(--gold-foreground)]">
                  Oportunidad
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-bold">Fotos y vídeos del carrusel</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {mediaOf(SHOWCASE).length} de {SHOWCASE_MAX_ITEMS} · pulsa para añadir, ordenar o quitar
                </p>
              </div>
            </button>
          )}

          {only !== 'hero' && only !== 'showcase' && categories.map((cat, index) => {
            const cover = coverOf(cat.slug)
            const count = mediaOf(cat.slug).length
            const albumCount = albums.filter((a) => a.category === cat.slug).length
            const visible = cat.visible !== false
            return (
              <div key={cat.slug} className="relative h-full">
              {/* Flechas para cambiar el orden (no pueden ir dentro del botón de la tarjeta). */}
              <div className="absolute left-3 top-3 z-10 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => void moveCategory(cat.slug, 'before')}
                  disabled={index === 0}
                  aria-label={`Mover «${cat.title.es}» un puesto antes`}
                  title="Mover antes"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-[var(--gold)] hover:text-[var(--gold-foreground)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-black/70 disabled:hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void moveCategory(cat.slug, 'after')}
                  disabled={index === categories.length - 1}
                  aria-label={`Mover «${cat.title.es}» un puesto después`}
                  title="Mover después"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-[var(--gold)] hover:text-[var(--gold-foreground)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-black/70 disabled:hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setOpenSlug(cat.slug)}
                className={`group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:-translate-y-0.5 hover:border-[var(--gold)] ${
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
              </div>
            )
          })}

          {/* Nueva categoría */}
          {only !== 'hero' && only !== 'showcase' && (
          <button
            type="button"
            onClick={() => setShowNewCategory(true)}
            className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-center transition hover:border-[var(--gold)] hover:text-gold"
          >
            <Plus className="h-8 w-8" />
            <span className="text-sm font-semibold">Nueva categoría</span>
          </button>
          )}
        </div>
      )}

      {dialogs}
    </div>
  )
}
