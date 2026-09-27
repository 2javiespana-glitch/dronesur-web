'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useQuote } from '@/components/quote-modal'
import { CATEGORIES, type Category } from '@/lib/content'

export function Categories() {
  const { t, tl } = useSite()
  const { open } = useQuote()
  const [categories, setCategories] = useState<Category[]>(CATEGORIES)

  useEffect(() => {
    const saved = localStorage.getItem('dronesur_categories')
    if (saved) {
      try {
        setCategories(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  return (
    <section id="servicios" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold sm:text-4xl">{t('cat.title')}</h2>
        <p className="mt-3 text-muted-foreground">{t('cat.subtitle')}</p>
        <div className="mx-auto mt-5 h-1 w-16 rounded-full bg-[var(--gold)]" />
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {categories.map((cat) => (
          <article
            key={cat.slug}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-[var(--gold)]/50 hover:shadow-lg"
          >
            <Link
              href={`/servicios/${cat.slug}`}
              className="relative block aspect-[4/3] overflow-hidden"
            >
              <Image
                src={cat.image || '/placeholder.svg'}
                alt={tl(cat.title)}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <span className="absolute bottom-3 left-3 rounded-full bg-[var(--gold)] px-3 py-1 text-xs font-bold text-[var(--gold-foreground)]">
                {tl(cat.price)}
              </span>
            </Link>

            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-lg font-bold leading-snug">{tl(cat.title)}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">
                {tl(cat.short)}
              </p>
              <div className="mt-5 flex items-center gap-2">
                <Link
                  href={`/servicios/${cat.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold transition hover:border-[var(--gold)] hover:text-gold"
                >
                  {t('cat.view')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <button
                  onClick={() => open({ service: tl(cat.title) })}
                  className="inline-flex items-center rounded-full bg-[var(--gold)] px-4 py-2 text-xs font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)]"
                >
                  {t('cat.quote')}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
