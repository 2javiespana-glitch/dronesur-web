'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Pencil, Plus, RotateCcw, Star, Trash2 } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { SITE } from '@/lib/content'
import { type Review, useReviews } from '@/lib/reviews'

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

  const login = (e: React.FormEvent) => {
    e.preventDefault()
    if (pass === SITE.adminPassword) {
      setAuthed(true)
      setError(false)
    } else {
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
    </main>
  )
}
