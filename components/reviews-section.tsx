'use client'

import { useEffect, useState } from 'react'
import { Star, Loader2, CheckCircle2 } from 'lucide-react'
import { LEGAL } from '@/lib/legal'
import { useSite } from '@/components/site-provider'

type Review = {
  id: string
  name: string
  role?: string
  rating: number
  text: string
  source: 'public' | 'admin'
  createdAt: number
}

function Stars({ value }: { value: number }) {
  if (!value) return null // opiniones sin puntuación: no se muestran estrellas
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

function timeAgo(ts: number, es: boolean) {
  const days = Math.floor((Date.now() - ts) / 86400000)
  if (days <= 0) return es ? 'Hoy' : 'Today'
  if (days === 1) return es ? 'Hace 1 día' : '1 day ago'
  if (days < 30) return es ? `Hace ${days} días` : `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return es ? `Hace ${months} mes${months > 1 ? 'es' : ''}` : `${months} month${months > 1 ? 's' : ''} ago`
  const years = Math.floor(months / 12)
  return es ? `Hace ${years} año${years > 1 ? 's' : ''}` : `${years} year${years > 1 ? 's' : ''} ago`
}

export function ReviewsSection() {
  const { lang } = useSite()
  const es = lang === 'es'
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
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

  // La media solo cuenta las opiniones que traen puntuación, y solo se muestra cuando hay
  // suficientes (5 o más) para que no resulte engañosa con pocas opiniones.
  const rated = reviews.filter((r) => r.rating > 0)
  const average = rated.length > 0 ? rated.reduce((sum, r) => sum + r.rating, 0) / rated.length : 0
  const showAverage = rated.length >= 5

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !text.trim()) {
      setError(es ? 'Rellena tu nombre y tu opinión.' : 'Please fill in your name and your review.')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', review: { name, role, rating, text } }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || (es ? 'No se pudo enviar la reseña.' : 'Your review could not be sent.'))
        return
      }
      setSent(true)
      setName('')
      setRole('')
      setText('')
      setRating(5)
      setTimeout(() => {
        setSent(false)
        setShowForm(false)
      }, 2500)
    } catch {
      setError(es ? 'Error de conexión. Inténtalo de nuevo.' : 'Connection error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section id="resenas" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold sm:text-4xl">{es ? 'Reseñas de clientes' : 'Customer reviews'}</h2>
        {showAverage && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <Stars value={Math.round(average)} />
            <span className="text-sm text-muted-foreground">
              {es
                ? `${average.toFixed(1)} de 5 · ${rated.length} valoraciones`
                : `${average.toFixed(1)} out of 5 · ${rated.length} ratings`}
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
          {es
            ? 'Todavía no hay opiniones publicadas. ¡Sé el primero en dejar la tuya!'
            : 'There are no published reviews yet. Be the first to leave yours!'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5"
            >
              <Stars value={r.rating} />
              <p className="mt-3 flex-1 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                "{r.text}"
              </p>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-sm font-semibold">{r.name}</span>
                  {r.role && (
                    <span className="block text-xs text-muted-foreground">{r.role}</span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(r.createdAt, es)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nota de transparencia: dice la verdad sobre de dónde salen las opiniones */}
      <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
        {es
          ? 'Opiniones recogidas de mensajes de clientes (por ejemplo, por WhatsApp) y publicadas con su permiso, o enviadas con el formulario de esta web y revisadas antes de publicarse. No se verifican de forma independiente.'
          : 'Reviews collected from customer messages (for example, via WhatsApp) and published with their permission, or sent through the form on this website and checked before publication. They are not independently verified.'}
        {LEGAL.serviciosGratuitosHasta &&
          (es
            ? ' Durante el lanzamiento, algunos trabajos se realizan sin coste, y parte de las opiniones puede referirse a ellos.'
            : ' During the launch period, some jobs are carried out free of charge, and some of the reviews may refer to them.')}
      </p>

      <div className="mt-10 flex justify-center">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full border border-[var(--gold)] px-6 py-3 text-sm font-semibold text-gold transition hover:bg-[var(--gold)] hover:text-[var(--gold-foreground)]"
          >
            {es ? 'Deja tu reseña' : 'Leave a review'}
          </button>
        ) : (
          <form
            onSubmit={submit}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6"
          >
            {sent ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-[var(--gold)]" />
                <p className="font-semibold">{es ? '¡Gracias por tu opinión!' : 'Thank you for your review!'}</p>
                <p className="text-xs text-muted-foreground">
                  {es ? 'La publicaremos en cuanto la revisemos.' : 'We will publish it as soon as we have checked it.'}
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold">{es ? 'Cuéntanos tu experiencia' : 'Tell us about your experience'}</h3>

                <label className="mt-4 block text-sm font-medium">{es ? 'Tu nombre' : 'Your name'}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                  placeholder={es ? 'Tu nombre' : 'Your name'}
                />

                <label className="mt-4 block text-sm font-medium">
                  {es ? 'Profesión o empresa' : 'Profession or company'}{' '}
                  <span className="font-normal text-muted-foreground">{es ? '(opcional)' : '(optional)'}</span>
                </label>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  maxLength={80}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                  placeholder={es ? 'Ej. Agente inmobiliario, Hotel Costa Luz' : 'E.g. Real estate agent, Costa Luz Hotel'}
                />

                <label className="mt-4 block text-sm font-medium">{es ? 'Puntuación' : 'Rating'}</label>
                <div className="mt-1.5 flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setRating(n)}
                      aria-label={es ? `${n} estrellas` : `${n} stars`}
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

                <label className="mt-4 block text-sm font-medium">{es ? 'Tu opinión' : 'Your review'}</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={600}
                  rows={4}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]"
                  placeholder={es ? '¿Qué tal fue tu experiencia con Dronesur?' : 'How was your experience with Dronesur?'}
                />

                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted"
                  >
                    {es ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex-1 rounded-full bg-[var(--gold)] px-4 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)] disabled:opacity-60"
                  >
                    {sending ? (es ? 'Enviando…' : 'Sending…') : es ? 'Enviar' : 'Send'}
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
