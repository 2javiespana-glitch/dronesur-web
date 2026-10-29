import Link from 'next/link'
import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/contact-footer'
import { CookieBanner } from '@/components/cookie-banner'
import { LangText } from '@/components/lang-text'
import { LEGAL, hasPlaceholders } from '@/lib/legal'

const MONTHS_EN: Record<string, string> = {
  enero: 'January',
  febrero: 'February',
  marzo: 'March',
  abril: 'April',
  mayo: 'May',
  junio: 'June',
  julio: 'July',
  agosto: 'August',
  septiembre: 'September',
  setiembre: 'September',
  octubre: 'October',
  noviembre: 'November',
  diciembre: 'December',
}

// Convierte fechas como «octubre de 2026» en «October 2026» para la versión en inglés.
export function dateEn(es: string) {
  return es
    .split(/\s+/)
    .filter((w) => w.toLowerCase() !== 'de')
    .map((w) => MONTHS_EN[w.toLowerCase()] ?? w)
    .join(' ')
}

// Convierte «IVA incluido» / «más IVA» en su versión en inglés.
export function ivaEn(es: string) {
  return es.replace(/m[aá]s IVA/i, 'plus VAT').replace(/IVA incluido/i, 'VAT included').replace(/IVA/g, 'VAT')
}

export function LegalPage({
  title,
  titleEn,
  children,
}: {
  title: string
  titleEn?: string
  children: ReactNode
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6">
        <Link href="/" className="text-sm text-muted-foreground transition hover:text-gold">
          <LangText es="← Volver al inicio" en="← Back to home" />
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">
          <LangText es={title} en={titleEn ?? title} />
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          <LangText
            es={<>Última actualización: {LEGAL.actualizado}</>}
            en={<>Last updated: {dateEn(LEGAL.actualizado)}</>}
          />
        </p>

        {hasPlaceholders() && (
          <div className="mt-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Faltan datos del titular. Rellénalos en <code>lib/legal.ts</code> (busca
            «[COMPLETAR]»). Este aviso desaparece solo cuando los completes todos.
          </div>
        )}

        <div className="mt-8 space-y-4 text-sm leading-relaxed text-foreground/90">
          {children}
        </div>
      </main>
      <SiteFooter />
      <CookieBanner />
    </>
  )
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="pt-4 text-xl font-bold text-foreground">{children}</h2>
}

export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>
}

export function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}
