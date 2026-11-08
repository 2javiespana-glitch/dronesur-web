'use client'

import { useEffect, useRef, useState } from 'react'
import { T } from '@/lib/content'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { CITIES } from '@/lib/cities'
import { AutoSaveStatus, useAutoSave } from '@/lib/use-autosave'
import {
  type SiteContent,
  EMPTY_CONTENT,
  normalizeContent,
  optimizeImage,
} from '@/lib/site-content'

// Panel del admin para cambiar la música del carrusel y los textos y fotos de
// "Sobre Dronesur" y "Sobre el piloto". Cada bloque se guarda solo, sin botón (ver lib/use-autosave.tsx).
// Habla con /api/content, que solo guarda si la contraseña de admin es correcta.

type Section = 'music' | 'about' | 'pilot' | 'cities'
type Message = { ok: boolean; text: string } | null

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]'
const primaryButton =
  'inline-flex items-center gap-1.5 rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)] disabled:opacity-60'
const secondaryButton =
  'inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold transition hover:bg-muted disabled:opacity-60'

async function saveSection(
  password: string,
  section: Section,
  data: unknown,
  keepalive = false,
): Promise<{ ok: true; content: SiteContent } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ section, data }),
      keepalive, // permite terminar de guardar aunque se cierre la ventana
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: body?.error || 'No se pudo guardar. Inténtalo de nuevo.' }
    return { ok: true, content: normalizeContent(body) }
  } catch {
    return { ok: false, error: 'No se pudo guardar. Revisa tu conexión.' }
  }
}

function Card({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-5">
      <h3 className="text-base font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  )
}

function Status({ message }: { message: Message }) {
  if (!message) return null
  return (
    <span className={message.ok ? 'text-sm text-muted-foreground' : 'text-sm text-destructive'}>
      {message.text}
    </span>
  )
}

// Foto con vista previa: subir, cambiar o quitar. Solo cambia el borrador; se guarda solo.
function ImageField({
  label,
  value,
  onChange,
  shape,
}: {
  label: string
  value: string
  onChange: (url: string) => void
  shape: 'wide' | 'round'
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError('')
    if (!file.type.startsWith('image/')) {
      setError(`"${file.name}" no es una foto. Sube un JPG, PNG o WebP.`)
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(`"${file.name}" pesa más de 10 MB. Comprímela y vuelve a intentarlo.`)
      return
    }
    setProgress(0)
    try {
      onChange(await uploadToCloudinary(file, 'image', setProgress))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto.')
    } finally {
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-4">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={optimizeImage(value, 400)}
            alt=""
            className={
              shape === 'round'
                ? 'h-24 w-24 rounded-full border border-border object-cover'
                : 'h-24 w-36 rounded-lg border border-border object-cover'
            }
          />
        ) : (
          <div
            className={
              (shape === 'round' ? 'h-24 w-24 rounded-full' : 'h-24 w-36 rounded-lg') +
              ' flex items-center justify-center border border-dashed border-border text-xs text-muted-foreground'
            }
          >
            Sin foto
          </div>
        )}
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => void pick(e.target.files?.[0])}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={progress !== null}
            className={secondaryButton}
          >
            {progress !== null ? `Subiendo... ${progress}%` : value ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {value && progress === null && (
            <button type="button" onClick={() => onChange('')} className={secondaryButton}>
              Quitar foto
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Música del carrusel
// ---------------------------------------------------------------------------
function MusicBlock({
  password,
  initial,
  autosave,
}: {
  password: string
  initial: SiteContent['music']
  autosave: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(initial.url)
  const [progress, setProgress] = useState<number | null>(null)
  const [message, setMessage] = useState<Message>(null)

  const auto = useAutoSave({
    value: url,
    enabled: autosave,
    delay: 400, // subir o quitar un audio es una acción puntual: se guarda enseguida
    save: async (next, { keepalive }) => {
      const result = await saveSection(password, 'music', { url: next }, keepalive)
      return result.ok ? null : result.error
    },
  })

  const pick = async (file: File | undefined) => {
    if (!file) return
    setMessage(null)
    if (!file.type.startsWith('audio/')) {
      setMessage({ ok: false, text: `"${file.name}" no es un archivo de audio. Sube un MP3.` })
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage({ ok: false, text: `"${file.name}" pesa más de 20 MB. Usa una versión más ligera.` })
      return
    }
    setProgress(0)
    try {
      setUrl(await uploadToCloudinary(file, 'auto', setProgress))
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'No se pudo subir el audio.' })
    } finally {
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Card
      title="Música del carrusel"
      description="Suena de fondo en la portada cuando el visitante pulsa el botón del altavoz. Por defecto está en silencio: los navegadores no permiten arrancar música solos."
    >
      {url ? (
        <audio controls src={url} className="w-full" preload="none" />
      ) : (
        <p className="text-sm text-muted-foreground">
          Ahora mismo no hay música, así que el botón del altavoz no aparece en la web.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          onChange={(e) => void pick(e.target.files?.[0])}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={progress !== null}
          className={secondaryButton}
        >
          {progress !== null ? `Subiendo... ${progress}%` : url ? 'Cambiar audio' : 'Subir audio (MP3)'}
        </button>
        {url && (
          <button type="button" onClick={() => setUrl('')} disabled={progress !== null} className={secondaryButton}>
            Quitar música
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Usa música tuya o libre de derechos (por ejemplo, de la biblioteca de audio de YouTube Studio o
        de Pixabay). Poner música con derechos de autor en tu web puede darte problemas.
      </p>

      <div className="flex items-center gap-3">
        <AutoSaveStatus status={auto.status} error={auto.error} />
        <Status message={message} />
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sobre Dronesur
// ---------------------------------------------------------------------------
function AboutBlock({
  password,
  initial,
  autosave,
}: {
  password: string
  initial: SiteContent['about']
  autosave: boolean
}) {
  const defaults = {
    p1: { es: T['about.p1']?.es ?? '', en: T['about.p1']?.en ?? '' },
    p2: { es: T['about.p2']?.es ?? '', en: T['about.p2']?.en ?? '' },
  }
  // Si todavía no has cambiado nada, se muestran los textos actuales de la web para que los edites.
  const [image, setImage] = useState(initial.image)
  const [p1Es, setP1Es] = useState(initial.p1.es || defaults.p1.es)
  const [p1En, setP1En] = useState(initial.p1.en || defaults.p1.en)
  const [p2Es, setP2Es] = useState(initial.p2.es || defaults.p2.es)
  const [p2En, setP2En] = useState(initial.p2.en || defaults.p2.en)
  const [message, setMessage] = useState<Message>(null)

  const auto = useAutoSave({
    value: { image, p1: { es: p1Es, en: p1En }, p2: { es: p2Es, en: p2En } },
    enabled: autosave,
    save: async (data, { keepalive }) => {
      const result = await saveSection(password, 'about', data, keepalive)
      return result.ok ? null : result.error
    },
  })

  const restore = () => {
    setP1Es(defaults.p1.es)
    setP1En(defaults.p1.en)
    setP2Es(defaults.p2.es)
    setP2En(defaults.p2.en)
    setMessage({ ok: true, text: 'Textos originales cargados.' })
  }

  return (
    <Card
      title="Sobre Dronesur"
      description="El texto y la foto de la sección «Sobre Dronesur». Si dejas el inglés vacío, esa versión mostrará el texto en español."
    >
      <ImageField label="Foto de la sección" value={image} onChange={setImage} shape="wide" />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Primer párrafo (español)</label>
          <textarea rows={6} value={p1Es} onChange={(e) => setP1Es(e.target.value)} maxLength={1200} className={inputClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Primer párrafo (inglés)</label>
          <textarea rows={6} value={p1En} onChange={(e) => setP1En(e.target.value)} maxLength={1200} className={inputClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Segundo párrafo (español)</label>
          <textarea rows={6} value={p2Es} onChange={(e) => setP2Es(e.target.value)} maxLength={1200} className={inputClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Segundo párrafo (inglés)</label>
          <textarea rows={6} value={p2En} onChange={(e) => setP2En(e.target.value)} maxLength={1200} className={inputClass} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={restore} className={secondaryButton}>
          Volver al texto original
        </button>
        <AutoSaveStatus status={auto.status} error={auto.error} />
        <Status message={message} />
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sobre el piloto
// ---------------------------------------------------------------------------
function PilotBlock({
  password,
  initial,
  autosave,
}: {
  password: string
  initial: SiteContent['pilot']
  autosave: boolean
}) {
  const [image, setImage] = useState(initial.image)
  const [name, setName] = useState(initial.name)
  const [textEs, setTextEs] = useState(initial.text.es)
  const [textEn, setTextEn] = useState(initial.text.en)

  const auto = useAutoSave({
    value: { name, image, text: { es: textEs, en: textEn } },
    enabled: autosave,
    save: async (data, { keepalive }) => {
      const result = await saveSection(password, 'pilot', data, keepalive)
      return result.ok ? null : result.error
    },
  })

  return (
    <Card
      title="Sobre el piloto"
      description="Tu presentación. La sección no se muestra en la web hasta que escribas el texto en español. Escribe solo lo que sea cierto: tu experiencia y los títulos que de verdad tienes."
    >
      <ImageField label="Tu foto" value={image} onChange={setImage} shape="round" />

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="pilot-name">
          Tu nombre
        </label>
        <input
          id="pilot-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Texto (español)</label>
          <textarea rows={8} value={textEs} onChange={(e) => setTextEs(e.target.value)} maxLength={2000} className={inputClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Texto (inglés, opcional)</label>
          <textarea rows={8} value={textEn} onChange={(e) => setTextEn(e.target.value)} maxLength={2000} className={inputClass} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <AutoSaveStatus status={auto.status} error={auto.error} />
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Páginas por ciudad
// ---------------------------------------------------------------------------
function CitiesBlock({
  password,
  initial,
  autosave,
}: {
  password: string
  initial: SiteContent['cities']
  autosave: boolean
}) {
  const [saved, setSaved] = useState<Record<string, string>>(initial)
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(CITIES.map((c) => [c.slug, initial[c.slug] ?? ''])),
  )

  const auto = useAutoSave({
    value: texts,
    enabled: autosave,
    save: async (data, { keepalive }) => {
      const result = await saveSection(password, 'cities', data, keepalive)
      if (!result.ok) return result.error
      setSaved(result.content.cities) // solo actualiza las etiquetas «Publicada» (no toca lo que estás escribiendo)
      return null
    },
  })

  return (
    <Card
      title="Páginas por ciudad"
      description="Cada ciudad puede tener su propia página (tuweb/dron/granada) con su propio título en Google, por ejemplo «Dron en Granada: fotografía y vídeo aéreo | Dronesur». Todas son parte de tu misma web. Una ciudad solo tiene página cuando escribes su texto aquí: si lo dejas vacío, esa página no existe."
    >
      <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">Escribe solo lo que sea cierto y útil para alguien de esa ciudad.</p>
        <p className="mt-1">
          No copies el mismo texto cambiando el nombre: Google lo trata como spam y puede perjudicar a toda tu web.
          Ideas de qué contar: desde dónde sales y cuánto tardas en llegar, si cobras desplazamiento, qué tipo de
          trabajos haces allí (inmobiliaria, eventos, obra…), trabajos que hayas hecho cerca, y cualquier detalle
          que sepas de volar en esa zona.
        </p>
      </div>

      {CITIES.map((city) => {
        const published = (saved[city.slug] ?? '').trim().length > 0
        return (
          <div key={city.slug}>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <label className="text-sm font-medium" htmlFor={`city-${city.slug}`}>
                {city.name}
              </label>
              <span
                className={
                  published
                    ? 'rounded-full bg-[var(--gold)] px-2 py-0.5 text-[10px] font-bold text-[var(--gold-foreground)]'
                    : 'rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground'
                }
              >
                {published ? 'Publicada' : 'Sin publicar'}
              </span>
              {published && (
                <a
                  href={`/dron/${city.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-gold"
                >
                  Ver página
                </a>
              )}
            </div>
            <textarea
              id={`city-${city.slug}`}
              rows={5}
              value={texts[city.slug] ?? ''}
              onChange={(e) => setTexts((prev) => ({ ...prev, [city.slug]: e.target.value }))}
              maxLength={3000}
              placeholder={`Texto de la página de ${city.name} (déjalo vacío si no quieres esa página)`}
              className={inputClass}
            />
          </div>
        )
      })}

      <div className="flex items-center gap-3">
        <AutoSaveStatus status={auto.status} error={auto.error} />
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
export type ContentBlockKey = 'music' | 'about' | 'pilot' | 'cities'

// Sin props extra muestra los cuatro bloques (como antes). Con `show` solo los que se indiquen,
// para poder colocar cada uno en su sitio dentro del admin.
export function ContentPanel({
  password,
  show,
  title,
  description,
}: {
  password: string
  show?: ContentBlockKey[]
  title?: string
  description?: string
}) {
  const has = (k: ContentBlockKey) => !show || show.includes(k)
  const heading = show ? title : (title ?? 'Música, textos y páginas por ciudad')
  const intro = show
    ? description
    : (description ??
      'Cambia aquí la música del carrusel, los textos y fotos de «Sobre Dronesur» y «Sobre el piloto», y las páginas por ciudad.')
  const [content, setContent] = useState<SiteContent | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/content', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setContent(normalizeContent(data))
      })
      .catch(() => {
        // Si no se puede leer, no se guarda nada automáticamente para no sobrescribir lo anterior.
        if (!cancelled) {
          setFailed(true)
          setContent(EMPTY_CONTENT)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mt-6">
      {heading && <h2 className="text-xl font-bold">{heading}</h2>}
      {intro && <p className="text-sm text-muted-foreground">{intro}</p>}

      {!content ? (
        <p className="mt-4 text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <>
          {failed && (
            <p className="mt-4 text-sm text-destructive">
              No se pudo leer lo que había guardado, así que por seguridad no se guarda nada automáticamente
              (para no borrar lo anterior). Recarga la página e inténtalo de nuevo.
            </p>
          )}
          {has('music') && <MusicBlock password={password} initial={content.music} autosave={!failed} />}
          {has('about') && <AboutBlock password={password} initial={content.about} autosave={!failed} />}
          {has('pilot') && <PilotBlock password={password} initial={content.pilot} autosave={!failed} />}
          {has('cities') && <CitiesBlock password={password} initial={content.cities} autosave={!failed} />}
        </>
      )}
    </div>
  )
}
