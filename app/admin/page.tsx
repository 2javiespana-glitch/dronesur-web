'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Pencil, Plus, RotateCcw, Star, Trash2, UploadCloud } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { type VideoItem, CATEGORIES, type Category } from '@/lib/content'
import { type Review, useReviews } from '@/lib/reviews'

// ⬅️ SUSTITUYE estos dos valores por los tuyos de Cloudinary (no son secretos, es normal que estén aquí)
const CLOUDINARY_CLOUD_NAME = 'bar5rrho'
const CLOUDINARY_UPLOAD_PRESET = 'dronesur videos'

type Draft = Omit<Review, 'id'>

const EMPTY: Draft = { name: '', role: '', rating: 5, text: '' }

export default function AdminPage() {
  const { t } = useSite()
  const { reviews, addReview, updateReview, deleteReview, resetReviews } = useReviews()

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

  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('dronesur_categories') : null
    return saved ? JSON.parse(saved) : CATEGORIES
  })

  const [editingCatSlug, setEditingCatSlug] = useState<string | null>(null)
  const [catDraft, setCatDraft] = useState<Category | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageUploadError, setImageUploadError] = useState('')

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

  // Guarda un elemento en el servidor (base de datos), no en el navegador.
  const saveMedia = async (item: { title: string; url: string; category: string; type: 'image' | 'video' }) => {
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

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newVideo.url) return
    const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(newVideo.url)
    const ok = await saveMedia({ ...newVideo, type: isVideo ? 'video' : 'image' })
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

  // Sube UN archivo (foto o vídeo) a Cloudinary y después guarda su URL + categoría en el servidor.
  const uploadOne = (file: File) =>
    new Promise<void>((resolve) => {
      const isVideo = file.type.startsWith('video/')
      const maxSizeMB = isVideo ? 100 : 10
      if (file.size > maxSizeMB * 1024 * 1024) {
        setUploadError(
          `"${file.name}" pesa ${(file.size / (1024 * 1024)).toFixed(0)}MB. El plan gratuito de Cloudinary acepta hasta ${maxSizeMB}MB por ${isVideo ? 'vídeo' : 'foto'}. Comprímelo y vuelve a intentarlo.`
        )
        resolve()
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

      const xhr = new XMLHttpRequest()
      // "auto" permite subir tanto fotos como vídeos con el mismo formulario.
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`)

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
            type: response.resource_type === 'video' ? 'video' : 'image',
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

  const startEditCategory = (cat: Category) => {
    setEditingCatSlug(cat.slug)
    setCatDraft({ ...cat, gallery: [...cat.gallery] })
  }

  const cancelEditCategory = () => {
    setEditingCatSlug(null)
    setCatDraft(null)
  }

  const saveCategory = (e: React.FormEvent) => {
    e.preventDefault()
    if (!catDraft) return
    const cleanGallery = catDraft.gallery.map((g) => g.trim()).filter(Boolean)
    const updatedDraft = { ...catDraft, gallery: cleanGallery }
    const updated = categories.map((c) => (c.slug === updatedDraft.slug ? updatedDraft : c))
    setCategories(updated)
    localStorage.setItem('dronesur_categories', JSON.stringify(updated))
    setEditingCatSlug(null)
    setCatDraft(null)
  }

  const resetCategories = () => {
    setCategories(CATEGORIES)
    localStorage.removeItem('dronesur_categories')
    setEditingCatSlug(null)
    setCatDraft(null)
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
    setDraft({ name: r.name, role: r.role, rating: r.rating, text: r.text })
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
            onClick={resetReviews}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold transition hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('admin.reset')}
          </button>

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
              </div>
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
                <span className="flex">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-[var(--gold)] text-[var(--gold)]" />
                  ))}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{r.role}</p>
              <p className="mt-1.5 text-sm text-foreground/90">{r.text}</p>
            </div>
            <div className="flex shrink-0 gap-2">
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
              onChange={(e) => setNewVideo({ ...newVideo, category: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
            >
              <option value="hero">Inicio (carrusel principal)</option>
              <option value="inmobiliaria">Inmobiliaria, Hoteles y Terrenos</option>
              <option value="eventos">Bodas, Graduaciones y Eventos</option>
              <option value="fotogrametria">Fotogrametría y Modelado 3D</option>
              <option value="obra">Seguimiento de Obra</option>
              <option value="aerea">Aérea / Otros servicios</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">
              Sube fotos o vídeos desde tu iPhone o tu ordenador (puedes elegir varios a la vez)
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
                accept="image/*,video/*"
                multiple
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

          <div className="sm:col-span-2 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            o pega la dirección si el vídeo ya está alojado en otro sitio
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="v-url">
              URL de la foto o del vídeo
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
            <option value="inmobiliaria">Inmobiliaria, Hoteles y Terrenos</option>
            <option value="eventos">Bodas, Graduaciones y Eventos</option>
            <option value="fotogrametria">Fotogrametría y Modelado 3D</option>
            <option value="obra">Seguimiento de Obra</option>
            <option value="aerea">Aérea / Otros servicios</option>
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
                <p className="text-xs text-muted-foreground">Categoría: {v.category} · {v.type === 'image' ? 'Foto' : 'Vídeo'}</p>
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

      {/* Panel de Gestión de Categorías */}
      <div className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Gestión de Categorías</h2>
            <p className="text-sm text-muted-foreground">Servicios que se muestran en la web</p>
          </div>
          <button
            onClick={resetCategories}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold transition hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar categorías originales
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {categories.map((cat) => (
            <div key={cat.slug} className="rounded-xl border border-border bg-card p-4">
              {editingCatSlug === cat.slug && catDraft ? (
                <form onSubmit={saveCategory} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Título (ES)</label>
                      <input
                        value={catDraft.title.es}
                        onChange={(e) =>
                          setCatDraft({ ...catDraft, title: { ...catDraft.title, es: e.target.value } })
                        }
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Title (EN)</label>
                      <input
                        value={catDraft.title.en}
                        onChange={(e) =>
                          setCatDraft({ ...catDraft, title: { ...catDraft.title, en: e.target.value } })
                        }
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Precio (ES)</label>
                      <input
                        value={catDraft.price.es}
                        onChange={(e) =>
                          setCatDraft({ ...catDraft, price: { ...catDraft.price, es: e.target.value } })
                        }
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Price (EN)</label>
                      <input
                        value={catDraft.price.en}
                        onChange={(e) =>
                          setCatDraft({ ...catDraft, price: { ...catDraft.price, en: e.target.value } })
                        }
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Descripción corta (ES)</label>
                      <textarea
                        rows={2}
                        value={catDraft.short.es}
                        onChange={(e) =>
                          setCatDraft({ ...catDraft, short: { ...catDraft.short, es: e.target.value } })
                        }
                        className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Short description (EN)</label>
                      <textarea
                        rows={2}
                        value={catDraft.short.en}
                        onChange={(e) =>
                          setCatDraft({ ...catDraft, short: { ...catDraft.short, en: e.target.value } })
                        }
                        className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Descripción larga (ES)</label>
                      <textarea
                        rows={4}
                        value={catDraft.description.es}
                        onChange={(e) =>
                          setCatDraft({
                            ...catDraft,
                            description: { ...catDraft.description, es: e.target.value },
                          })
                        }
                        className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Long description (EN)</label>
                      <textarea
                        rows={4}
                        value={catDraft.description.en}
                        onChange={(e) =>
                          setCatDraft({
                            ...catDraft,
                            description: { ...catDraft.description, en: e.target.value },
                          })
                        }
                        className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Imagen principal (URL)</label>
                    <input
                      value={catDraft.image}
                      onChange={(e) => setCatDraft({ ...catDraft, image: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Las fotos y vídeos de cada categoría se gestionan arriba, en «Gestión de Fotos y Vídeos».
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-full bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)]"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditCategory}
                      className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">{cat.title.es}</p>
                    <p className="text-xs text-muted-foreground">{cat.price.es}</p>
                    <p className="mt-1 text-sm text-foreground/80">{cat.short.es}</p>
                  </div>
                  <button
                    onClick={() => startEditCategory(cat)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
