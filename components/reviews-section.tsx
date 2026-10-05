'use client'

import { useEffect, useState } from 'react'
import { Star, Loader2, CheckCircle2 } from 'lucide-react'

type Review = {
  id: string
  name: string
  rating: number
  text: string
  source: 'public' | 'admin'
  createdAt: number
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${
            n <= value ? 'fill-[var(--gold)] text-[var(--gold)]' : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )
}

function timeAgo(ts: number) {
  const days = Math.floor((Date.now() - ts) / 86400000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Hace 1 día'
  if (days < 30) return `Hace ${days} días`
  const months = Math.floor(days / 30)
  if (months < 12) return `Hace ${months} mes${months > 1 ? 'es' : ''}`
  const years = Math.floor(months / 12)
  return `Hace ${years} año${years > 1 ? 's' : ''}`
}

export function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const load = () => {
    fetch('/api/reviews', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setReviews(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const average =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !text.trim()) {
      setError('Rellena tu nombre y tu opinión.')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', review: { name, rating, text } }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || 'No se pudo enviar la reseña.')
        return
      }
      setReviews((prev) => [data.review, ...prev])
      setSent(true)
      setName('')
      setText('')
      setRating(5)
      setTimeout(() => {
        setSent(false)
        setShowForm(false)
      }, 2500)
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section id="resenas" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Reseñas de clientes</h2>
        {reviews.length > 0 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <Stars value={Math.round(average)} />
            <span className="text-sm text-muted-foreground">
              {average.toFixed(1)} de 5 · {reviews.length} reseña{reviews.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        <div className="mx-auto mt-5 h-1 w-16 rounded-full bg-[var(--gold)]" />
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          Todavía no hay reseñas. ¡Sé el primero en dejar la tuya!
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5"
            >
              <Stars value={r.rating} />
              <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground/90">
                "{r.text}"
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-semibold">{r.name}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 flex justify-center">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full border border-[var(--gold)] px-6 py-3 text-sm font-semibold text-gold transition hover:bg-[var(--gold)] hover:text-[var(--gold-foreground)]"
          >
            Deja tu reseña
          </button>
        ) : (
          <form
            onSubmit={submit}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6"
          >
            {sent ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-[var(--gold)]" />
                <p className="font-semibold">¡Gracias por tu opinión!</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold">Cuéntanos tu experiencia</h3>

                <label className="mt-4 block text-sm font-medium">Tu nombre</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                  placeholder="Tu nombre"
                />

                <label className="mt-4 block text-sm font-medium">Puntuación</label>
                <div className="mt-1.5 flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setRating(n)}
                      aria-label={`${n} estrellas`}
                    >
                      <Star
                        className={`h-7 w-7 transition ${
                          n <= rating
                            ? 'fill-[var(--gold)] text-[var(--gold)]'
                            : 'text-muted-foreground/30 hover:text-muted-foreground/60'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <label className="mt-4 block text-sm font-medium">Tu opinión</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={600}
                  rows={4}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                  placeholder="¿Qué tal fue tu experiencia con Dronesur?"
                />

                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex-1 rounded-full bg-[var(--gold)] px-4 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)] disabled:opacity-60"
                  >
                    {sending ? 'Enviando…' : 'Enviar'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </section>
  )
}
