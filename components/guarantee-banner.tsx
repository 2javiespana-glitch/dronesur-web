'use client'

import { ShieldCheck } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { type SiteContent, localizedOr } from '@/lib/site-content'

// Banda dorada de garantía. El título, el texto y las condiciones se cambian desde el admin
// (sección «Garantía»); si los dejas en blanco, se usan los de siempre.
export function GuaranteeBanner({ content }: { content: SiteContent['guarantee'] }) {
  const { t, lang } = useSite()
  const title = localizedOr(content.title, lang) || t('guarantee.title')
  const text = localizedOr(content.text, lang) || t('guarantee.text')
  // Las condiciones solo salen si las escribes (en blanco = no se muestra nada).
  const note = localizedOr(content.note, lang)

  return (
    <section className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-soft)] p-8 text-center text-[var(--gold-foreground)] sm:p-10">
          <div className="pointer-events-none absolute inset-0 opacity-10">
            <div className="absolute -left-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-black/40 blur-2xl" />
          </div>
          <div className="relative flex flex-col items-center gap-3">
            <ShieldCheck className="h-10 w-10" />
            <h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>
            <p className="max-w-xl text-pretty text-base font-medium sm:text-lg">{text}</p>
            {note && (
              <p className="max-w-xl whitespace-pre-line text-pretty text-xs font-medium opacity-75">{note}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
