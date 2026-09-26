'use client'

import Link from 'next/link'
import { Lock, Star } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useReviews } from '@/lib/reviews'

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} / 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? 'fill-[var(--gold)] text-[var(--gold)]' : 'text-muted-foreground/40'
          }`}
        />
      ))}
    </div>
  )
}

export function ReviewsSection() {
  const { t } = useSite()
  const { reviews } = useReviews()

  return (
    <section id="resenas" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{t('reviews.title')}</h2>
          <p className="mt-3 text-muted-foreground">{t('reviews.subtitle')}</p>
          <div className="mx-auto mt-5 h-1 w-16 rounded-full bg-[var(--gold)]" />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <figure
              key={r.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:border-[var(--gold)]/40"
            >
              <Stars rating={r.rating} />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/90">
                “{r.text}”
              </blockquote>
              <figcaption className="mt-5 border-t border-border pt-4">
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-semibold text-muted-foreground transition hover:border-[var(--gold)] hover:text-gold"
          >
            <Lock className="h-3.5 w-3.5" />
            {t('reviews.admin')}
          </Link>
        </div>
      </div>
    </section>
  )
}
