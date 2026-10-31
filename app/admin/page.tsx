'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Pencil, Plus, RotateCcw, Star, Trash2, UploadCloud } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { type VideoItem, CATEGORIES, type Category } from '@/lib/content'
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

// ⬅️ SUSTITUYE estos dos valores por los tuyos de Cloudinary (no son secretos, es normal que estén aquí)
const CLOUDINARY_CLOUD_NAME = 'bar5rrho'
const CLOUDINARY_UPLOAD_PRESET = 'dronesur videos'

type Album = { id: string; category: string; title: string; createdAt: number }

const EMPTY_CATEGORY_DRAFT = {
  titleEs: '',
  titleEn: '',
  shortEs: '',
  shortEn: '',
  descriptionEs: '',
  descriptionEn: '',
  priceEs: '',
  priceEn: '',
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
  }
const SETTINGS_LABELS: { key: Exclude<keyof SiteSettings, 'promoOverride'>; label: string }[] = [    
  { key: 'promo', label: 'Banner de bienvenida / descuento' },
    { key: 'coverage', label: 'Zonas de cobertura' },
    { key: 'guarantee', label: 'Garantía legal' },
    { key: 'reviews', label: 'Reseñas de clientes' },
    { key: 'legal', label: 'Sección legal' },
    { key: 'about', label: 'Sobre Nosotros' },
    { key: 'pilot', label: 'Sobre el piloto' },
  ]

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

  const [categories, setCategories] = useState<Category[]>(CATEGORIES)
  const jobCategories = categories.map((c) => ({ value: c.slug, label: c.title.es }))

  const [categoryDraft, setCategoryDraft] = useState(EMPTY_CATEGORY_DRAFT)
  const [categoryError, setCategoryError] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)

  const loadCategories = () => {
    fetch('/api/categories', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data)
      })
      .catch(() => setCategoryError('No se pudieron cargar las categorías.'))
  }

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryDraft.titleEs.trim()) {
      setCategoryError('Ponle al menos un título en español.')
      return
    }
    setCreatingCategory(true)
    setCategoryError('')
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          action: 'add',
          category: {
            title: { es: categoryDraft.titleEs, en: categoryDraft.titleEn },
            short: { es: categoryDraft.shortEs, en: categoryDraft.shortEn },
            description: { es: categoryDraft.descriptionEs, en: categoryDraft.descriptionEn },
            price: { es: categoryDraft.priceEs, en: categoryDraft.priceEn },
          },
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setCategoryError(data?.error || 'No se pudo crear la categoría.')
        return
      }
      setCategories(data.categories)
      setCategoryDraft(EMPTY_CATEGORY_DRAFT)
    } catch {
      setCategoryError('Error de conexión al crear la categoría.')
    } finally {
      setCreatingCategory(false)
    }
  }

  const toggleCategoryVisible = async (cat: Category) => {
    const nextVisible = !(cat.visible ?? true)
    setCategories((prev) =>
      prev.map((c) => (c.slug === cat.slug ? { ...c, visible: nextVisible } : c)),
    ) // optimista: se ve el cambio al instante
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          action: 'update',
          slug: cat.slug,
          category: { visible: nextVisible },
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setCategoryError(data?.error || 'No se pudo actualizar la categoría.')
        void loadCategories() // revertimos al estado real si falló
        return
      }
      setCategories(data.categories)
    } catch {
      setCategoryError('Error de conexión al actualizar la categoría.')
      void loadCategories()
    }
  }

  const [authed, setAuthed] = useState(false)
  const [pass, setPass] = useState('')
  const [error, setError] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [showForm, setShowForm] = useState(false)
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [mediaError, setMediaError] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [uploadInfo, setUploadInfo] = useState('')

  const [newVideo, setNewVideo] = useState({ title: '', url: '', category: 'hero' })
  // Qué tipo de contenido se va a subir: normal (foto o vídeo), foto 360°, modelo 3D o enlace incrustado.
  const [contentKind, setContentKind] = useState<'normal' | 'panorama' | 'model3d' | 'embed'>('normal')
  const [albums, setAlbums] = useState<Album[]>([])
  const [selectedAlbumId, setSelectedAlbumId] = useState('') // '' = sin álbum (galería general)
  const [newAlbumTitle, setNewAlbumTitle] = useState('')
  const [creatingAlbum, setCreatingAlbum] = useState(false)
  const [albumError, setAlbumError] = useState('')

  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')

  const jsonHeaders = { 'Content-Type': 'application/json', 'x-admin-password': pass }

  const loadMedia = async () => {
    try {
      const res = await fetch('/api/media', { cache: 'no-store' })
      const data = await res.json()
      setVideos(Array.isArray(data) ? data : [])
    } catch {
      setMediaError('No se pudo cargar la lista de fotos y vídeos.')
    }
  }

  const loadAlbums = async () => {
    try {
      const res = await fetch('/api/albums', { cache: 'no-store' })
      const data = await res.json()
      setAlbums(Array.isArray(data) ? data : [])
    } catch {
      setAlbumError('No se pudieron cargar los álbumes.')
    }
  }

  const createAlbum = async () => {
    const title = newAlbumTitle.trim()
    if (!title) return
    if (!jobCategories.some((c) => c.value === newVideo.category)) return
    setCreatingAlbum(true)
    setAlbumError('')
    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ action: 'add', album: { category: newVideo.category, title } }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setAlbumError(data?.error || 'No se pudo crear el álbum.')
        return
      }
      setAlbums(data.albums)
      const created = data.albums[data.albums.length - 1]
      setSelectedAlbumId(created?.id ?? '')
      setNewAlbumTitle('')
    } catch {
      setAlbumError('Error de conexión al crear el álbum.')
    } finally {
      setCreatingAlbum(false)
    }
  }

  const deleteAlbum = async (id: string) => {
    if (!confirm('¿Borrar este álbum? También se borrarán las fotos y vídeos que tenga dentro.')) return
    try {
      const res = await fetch('/api/albums', {
        method: 'DELETE',
        headers: jsonHeaders,
        body: JSON.stringify({ id }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setAlbumError(data?.error || 'No se pudo borrar el álbum.')
        return
      }
      setAlbums(data.albums)
      if (selectedAlbumId === id) setSelectedAlbumId('')
      void loadMedia()
    } catch {
      setAlbumError('Error de conexión al borrar el álbum.')
    }
  }

  // Guarda un elemento en el servidor (base de datos), no en el navegador.
  const saveMedia = async (item: { title: string; url: string; category: string; type: 'image' | 'video' | 'panorama' | 'model3d' | 'embed'; albumId?: string }) => {
    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ action: 'add', item }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setMediaError(data?.error || 'No se pudo guardar.')
        return false
      }
      setVideos(data.items)
      setMediaError('')
      return true
    } catch {
      setMediaError('Error de conexión al guardar.')
      return false
    }
  }

  const currentAlbumId = () =>
    jobCategories.some((c) => c.value === newVideo.category) && selectedAlbumId
      ? selectedAlbumId
      : undefined

  // El tipo especial (360°, 3D, enlace) solo vale en las categorías de servicio,
  // nunca en el carrusel de inicio ni en las portadas.
  const isServiceCategory = jobCategories.some((c) => c.value === newVideo.category)
  const effectiveKind = isServiceCategory ? contentKind : 'normal'

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newVideo.url) return
    const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(newVideo.url)
    const type =
      effectiveKind === 'panorama'
        ? 'panorama'
        : effectiveKind === 'model3d'
          ? 'model3d'
          : effectiveKind === 'embed'
            ? 'embed'
            : isVideo
              ? 'video'
              : 'image'
    const ok = await saveMedia({ ...newVideo, type, albumId: currentAlbumId() })
    if (ok) setNewVideo({ title: '', url: '', category: newVideo.category })
  }

  const handleDeleteVideo = async (id: string) => {
    try {
      const res = await fetch('/api/media', {
        method: 'DELETE',
        headers: jsonHeaders,
        body: JSON.stringify({ id }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setMediaError(data?.error || 'No se pudo borrar.')
        return
      }
      setVideos(data.items)
    } catch {
      setMediaError('Error de conexión al borrar.')
    }
  }

  // Sube UN archivo (foto, vídeo, foto 360° o modelo 3D) a Cloudinary y después guarda
  // su URL + categoría en el servidor.
  const uploadOne = (file: File) =>
    new Promise<void>((resolve) => {
      const kind = effectiveKind
      const isVideo = file.type.startsWith('video/')
      const isModel = kind === 'model3d'

      if (isModel && !/\.glb$/i.test(file.name)) {
        setUploadError(`"${file.name}" no es un modelo .glb. Exporta tu modelo en formato GLB (un único archivo).`)
        resolve()
        return
      }
      if (kind === 'panorama' && !file.type.startsWith('image/')) {
        setUploadError(`"${file.name}" no es una foto. Para una foto 360° sube una imagen (JPG).`)
        resolve()
        return
      }

      const maxSizeMB = isModel ? 10 : isVideo ? 100 : 10
      const label = isModel ? 'modelo 3D' : isVideo ? 'vídeo' : 'foto'
      if (file.size > maxSizeMB * 1024 * 1024) {
        setUploadError(
          `"${file.name}" pesa ${(file.size / (1024 * 1024)).toFixed(0)}MB. El plan gratuito de Cloudinary acepta hasta ${maxSizeMB}MB por ${label}. ` +
            (isModel
              ? 'Optimízalo (menos polígonos y texturas más pequeñas) o súbelo a Sketchfab y usa «Enlace incrustado».'
              : 'Comprímelo y vuelve a intentarlo.'),
        )
        resolve()
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

      const xhr = new XMLHttpRequest()
      // "auto" sube fotos y vídeos; los modelos 3D van como archivo "raw"; las panorámicas como imagen.
      const endpoint = isModel ? 'raw' : kind === 'panorama' ? 'image' : 'auto'
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${endpoint}/upload`)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100))
        }
      }

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText)
          await saveMedia({
            title: newVideo.title,
            url: response.secure_url,
            category: newVideo.category,
            type:
              kind === 'panorama'
                ? 'panorama'
                : kind === 'model3d'
                  ? 'model3d'
                  : response.resource_type === 'video'
                    ? 'video'
                    : 'image',
            albumId: currentAlbumId(),
          })
        } else {
          let detail = ''
          try {
            detail = JSON.parse(xhr.responseText)?.error?.message ?? ''
          } catch {}
          setUploadError(`No se pudo subir "${file.name}". ${detail}`)
        }
        resolve()
      }

      xhr.onerror = () => {
        setUploadError('Error de conexión al subir el archivo. Comprueba tu internet e inténtalo de nuevo.')
        resolve()
      }

      xhr.send(formData)
    })

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return
    setUploading(true)
    setUploadError('')
    setMediaError('')
    for (let i = 0; i < files.length; i++) {
      setUploadInfo(files.length > 1 ? `(${i + 1} de ${files.length})` : '')
      setUploadProgress(0)
      await uploadOne(files[i])
    }
    setUploading(false)
    setUploadInfo('')
    setNewVideo({ ...newVideo, title: '' })
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragOver(false)
    void uploadFiles(Array.from(e.dataTransfer.files ?? []))
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void uploadFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

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
        void loadMedia()
        void loadAlbums()
        loadReviews()
        loadSettings()
        loadCategories()
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

      {/* Panel: Qué se ve en la web */}
      <div className="mt-10">
        <h2 className="text-xl font-bold">Qué se ve en la web</h2>
        <p className="text-sm text-muted-foreground">
          Desmarca una casilla para ocultar esa sección de la página principal. El Inicio
          (carrusel), los Servicios y el Contacto siempre están visibles.
        </p>

        <div className="mt-4 grid gap-2 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
          {SETTINGS_LABELS.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(e) => saveSettings({ ...settings, [key]: e.target.checked })}
                className="h-4 w-4 rounded border-input accent-[var(--gold)]"
              />
              Show: {label}
            </label>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          {settingsSaving && <span>Guardando…</span>}
          {settingsSaved && <span className="text-[var(--gold)]">Guardado ✓</span>}
          {settingsError && <span className="text-destructive">{settingsError}</span>}
        </div>
      </div>

      {/* Panel: Texto del banner de descuento */}
      <div className="mt-10">
        <h2 className="text-xl font-bold">Texto del banner de descuento</h2>
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

      {/* Panel: Categorías de servicio */}
      <div className="mt-10">
        <h2 className="text-xl font-bold">Categorías de servicio</h2>
        <p className="text-sm text-muted-foreground">
          Crea tantas categorías como quieras (ej. "Deportes", "Tomas para cine"). Desmarca
          "Mostrar" para ocultar la que no tenga futuro, sin borrar sus fotos ni vídeos.
          Aparecen en la portada con el mismo estilo que las demás.
        </p>

        {categoryError && <p className="mt-2 text-sm text-destructive">{categoryError}</p>}

        {/* Listado */}
        <div className="mt-4 space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.slug}
              className={`flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 ${
                cat.visible === false ? 'opacity-50' : ''
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{cat.title.es}</p>
                <p className="truncate text-xs text-muted-foreground">
                  /servicios/{cat.slug} · {cat.price.es || 'sin precio'}
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={cat.visible !== false}
                  onChange={() => toggleCategoryVisible(cat)}
                  className="h-4 w-4 rounded border-input accent-[var(--gold)]"
                />
                Mostrar
              </label>
            </div>
          ))}
        </div>

        {/* Formulario de nueva categoría */}
        <form
          onSubmit={addCategory}
          className="mt-5 grid gap-5 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2"
        >
          <h3 className="text-sm font-semibold sm:col-span-2">+ Nueva categoría</h3>

          {(
            [
              { lang: 'Español', title: 'titleEs', short: 'shortEs', desc: 'descriptionEs', price: 'priceEs' },
              { lang: 'English', title: 'titleEn', short: 'shortEn', desc: 'descriptionEn', price: 'priceEn' },
            ] as const
          ).map((col) => (
            <div key={col.lang} className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground">{col.lang}</h4>

              <div>
                <label className="mb-1 block text-xs font-medium">
                  Título {col.lang === 'Español' && '(obligatorio)'}
                </label>
                <input
                  value={categoryDraft[col.title]}
                  onChange={(e) => setCategoryDraft({ ...categoryDraft, [col.title]: e.target.value })}
                  placeholder={col.lang === 'Español' ? 'Ej. Deportes' : 'Ej. Sports'}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">Resumen corto (tarjeta de inicio)</label>
                <input
                  value={categoryDraft[col.short]}
                  onChange={(e) => setCategoryDraft({ ...categoryDraft, [col.short]: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">Descripción (dentro de la categoría)</label>
                <textarea
                  rows={2}
                  value={categoryDraft[col.desc]}
                  onChange={(e) => setCategoryDraft({ ...categoryDraft, [col.desc]: e.target.value })}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">Precio (ej. "desde 30 €/hora")</label>
                <input
                  value={categoryDraft[col.price]}
                  onChange={(e) => setCategoryDraft({ ...categoryDraft, [col.price]: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                />
              </div>
            </div>
          ))}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creatingCategory}
              className="rounded-full bg-[var(--gold)] px-6 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)] disabled:opacity-60"
            >
              {creatingCategory ? 'Creando…' : '+ Crear categoría'}
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              La foto de la tarjeta se añade después, igual que con las demás: eligiéndola
              en "Gestión de Fotos y Vídeos" con la categoría "Portada — {categoryDraft.titleEs || '...'}".
            </p>
          </div>
        </form>
      </div>

      {/* Panel de Gestión de Vídeos */}
      <div className="mt-10">
        <h2 className="text-xl font-bold">Gestión de Fotos y Vídeos</h2>
        <p className="text-sm text-muted-foreground">Elige la categoría y sube fotos o vídeos. El carrusel de inicio solo usa vídeos.</p>

        <form
          onSubmit={handleAddVideo}
          className="mt-4 grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="v-title">
              Título
            </label>
            <input
              id="v-title"
              value={newVideo.title}
              onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="v-category">
              Categoría
            </label>
            <select
              id="v-category"
              value={newVideo.category}
              onChange={(e) => {
                setNewVideo({ ...newVideo, category: e.target.value })
                setSelectedAlbumId('')
                setNewAlbumTitle('')
              }}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
            >
              <optgroup label="Inicio">
                <option value="hero">Carrusel principal (vídeos)</option>
              </optgroup>
              <optgroup label="Categorías (subpágina de cada servicio)">
                {jobCategories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Portada (tarjeta en la página principal)">
                {jobCategories.map((c) => (
                  <option key={`cover-${c.value}`} value={`cover-${c.value}`}>
                    Portada — {c.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {jobCategories.some((c) => c.value === newVideo.category) && (
            <div className="sm:col-span-2 rounded-xl border border-border bg-background/50 p-4">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="v-album">
                Álbum (carpeta del trabajo, ej. "Boda García-Pérez")
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  id="v-album"
                  value={selectedAlbumId}
                  onChange={(e) => setSelectedAlbumId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] sm:flex-1"
                >
                  <option value="">Sin álbum (galería general de la categoría)</option>
                  {albums
                    .filter((a) => a.category === newVideo.category)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))}
                </select>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={newAlbumTitle}
                  onChange={(e) => setNewAlbumTitle(e.target.value)}
                  placeholder="Nombre del nuevo álbum (ej. Boda García-Pérez)"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] sm:flex-1"
                />
                <button
                  type="button"
                  onClick={createAlbum}
                  disabled={!newAlbumTitle.trim() || creatingAlbum}
                  className="shrink-0 rounded-lg bg-[var(--gold)] px-4 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)] disabled:opacity-50"
                >
                  {creatingAlbum ? 'Creando…' : '+ Crear álbum'}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Crea el álbum una vez; después ya queda seleccionado arriba para todo lo que subas
                a continuación en esta misma categoría.
              </p>
              {albumError && <p className="mt-2 text-sm text-destructive">{albumError}</p>}
            </div>
          )}

          {isServiceCategory && (
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="v-kind">
                Tipo de contenido
              </label>
              <select
                id="v-kind"
                value={contentKind}
                onChange={(e) => setContentKind(e.target.value as typeof contentKind)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
              >
                <option value="normal">Foto o vídeo normal</option>
                <option value="panorama">Foto 360° (el visitante la gira y hace zoom)</option>
                <option value="model3d">Modelo 3D (archivo .glb)</option>
                <option value="embed">Enlace incrustado (Sketchfab, Kuula o Matterport)</option>
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {contentKind === 'normal' &&
                  'Fotos y vídeos de siempre. Se pueden subir varios a la vez.'}
                {contentKind === 'panorama' &&
                  'Una foto panorámica esférica en formato 2:1 (el doble de ancha que alta), como las que hace el modo «Esfera» del dron. Máximo 10 MB y 25 megapíxeles: unos 6000 × 3000 píxeles va perfecto.'}
                {contentKind === 'model3d' &&
                  'Un único archivo .glb de máximo 10 MB. Si tu modelo pesa más, súbelo a Sketchfab (gratis) y usa «Enlace incrustado».'}
                {contentKind === 'embed' &&
                  'No se sube ningún archivo: pega abajo la dirección del modelo o del recorrido. Solo se admiten Sketchfab, Kuula y Matterport.'}
              </p>
            </div>
          )}

          {effectiveKind !== 'embed' && (
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">
              {effectiveKind === 'panorama'
                ? 'Sube la foto 360°'
                : effectiveKind === 'model3d'
                  ? 'Sube el modelo 3D (.glb)'
                  : 'Sube fotos o vídeos desde tu iPhone o tu ordenador (puedes elegir varios a la vez)'}
            </label>
            <label
              htmlFor="v-file"
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center text-sm transition ${
                dragOver ? 'border-[var(--gold)] bg-[var(--gold)]/5' : 'border-border'
              }`}
            >
              <input
                id="v-file"
                type="file"
                accept={
                  effectiveKind === 'model3d'
                    ? '.glb,model/gltf-binary'
                    : effectiveKind === 'panorama'
                      ? 'image/*'
                      : 'image/*,video/*'
                }
                multiple={effectiveKind === 'normal'}
                onChange={handleFileInputChange}
                className="hidden"
              />
              <UploadCloud className="h-6 w-6 text-muted-foreground" />
              {uploading ? (
                <span>Subiendo {uploadInfo}... {uploadProgress}%</span>
              ) : (
                <span>
                  En el ordenador: arrastra aquí el archivo. En el iPhone: toca aquí para elegirlo de tu galería.
                </span>
              )}
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              Se añade solo en cuanto termine de subir — no hace falta pulsar "Añadir vídeo" para este caso.
            </p>
            {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
          </div>
          )}

          <div className="sm:col-span-2 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            o pega la dirección si el vídeo ya está alojado en otro sitio
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="v-url">
              {effectiveKind === 'embed' ? 'Dirección del contenido (Sketchfab, Kuula o Matterport)' : 'URL de la foto o del vídeo'}
            </label>
            <input
              id="v-url"
              value={newVideo.url}
              onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)]"
            >
              <Plus className="h-4 w-4" />
              Añadir (solo si pegaste una URL arriba)
            </button>
          </div>
        </form>

        {mediaError && <p className="mt-3 text-sm text-destructive">{mediaError}</p>}

        <div className="mt-6 flex items-center gap-3">
          <label className="text-sm font-medium" htmlFor="v-filter">
            Ver
          </label>
          <select
            id="v-filter"
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
          >
            <option value="all">Todas las categorías</option>
            <option value="hero">Inicio (carrusel principal)</option>
            {jobCategories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
            {jobCategories.map((c) => (
              <option key={`cover-${c.value}`} value={`cover-${c.value}`}>
                Portada — {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {videos.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Todavía no hay fotos ni vídeos.
            </p>
          )}
          {videos
            .filter((v) => filterCat === 'all' || v.category === filterCat)
            .map((v) => (
            <div
              key={v.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold">{v.title || '(sin título)'}</p>
                <p className="truncate text-xs text-muted-foreground">{v.url}</p>
                <p className="text-xs text-muted-foreground">
                  Categoría: {v.category} · {v.type === 'image' ? 'Foto' : v.type === 'panorama' ? 'Foto 360°' : v.type === 'model3d' ? 'Modelo 3D' : v.type === 'embed' ? 'Enlace incrustado' : 'Vídeo'}
                  {v.albumId && (
                    <> · Álbum: {albums.find((a) => a.id === v.albumId)?.title ?? '(borrado)'}</>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleDeleteVideo(v.id)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Panel de Gestión de Álbumes (carpetas dentro de cada categoría) */}
      <div className="mt-10">
        <h2 className="text-xl font-bold">Álbumes creados</h2>
        <p className="text-sm text-muted-foreground">
          Borrar un álbum borra también todas las fotos y vídeos que tenga dentro.
        </p>
        {albumError && <p className="mt-2 text-sm text-destructive">{albumError}</p>}
        <div className="mt-4 space-y-2">
          {albums.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavía no has creado ningún álbum.</p>
          )}
          {albums.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {jobCategories.find((c) => c.value === a.category)?.label ?? a.category} ·{' '}
                  {videos.filter((v) => v.albumId === a.id).length} archivo(s)
                </p>
              </div>
              <button
                onClick={() => deleteAlbum(a.id)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </div>

    </main>
  )
}
