import Link from 'next/link'
import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/contact-footer'
import { CookieBanner } from '@/components/cookie-banner'
import { LEGAL, hasPlaceholders } from '@/lib/legal'

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6">
        <Link href="/" className="text-sm text-muted-foreground transition hover:text-gold">
          ← Volver al inicio
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Última actualización: {LEGAL.actualizado}
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
