'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { LangOverride, useSite } from '@/components/site-provider'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/contact-footer'
import { WhatsAppFab } from '@/components/whatsapp-fab'
import { CookieBanner } from '@/components/cookie-banner'
import type { Lang } from '@/lib/content'

// Página de error 404 con la imagen de la web (cabecera, pie y botones de siempre).
// Se muestra cuando alguien entra en una dirección que no existe, o en una categoría
// que has ocultado desde el admin. Está en español e inglés: si la dirección empieza por /en
// se ve en inglés; si no, en el idioma que el visitante tenga elegido.

const TEXT: Record<Lang, { title: string; text: string; home: string; services: string; homeHref: string; servicesHref: string }> = {
  es: {
    title: 'Esta toma no existe',
    text: 'Parece que el dron se ha desviado de la ruta. La página que buscas no existe o ha cambiado de sitio.',
    home: 'Volver al inicio',
    services: 'Ver servicios',
    homeHref: '/',
    servicesHref: '/#servicios',
  },
  en: {
    title: "This shot doesn't exist",
    text: "Looks like the drone drifted off course. The page you're looking for doesn't exist or has moved.",
    home: 'Back to home',
    services: 'View services',
    homeHref: '/en',
    servicesHref: '/en#servicios',
  },
}

function NotFoundBody() {
  const { lang } = useSite()
  const c = TEXT[lang]

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center px-6 pb-20 pt-32 text-center">
        <p
          aria-hidden="true"
          className="bg-gradient-to-b from-[var(--gold)] to-[var(--gold-soft)] bg-clip-text text-8xl font-bold leading-none tracking-tight text-transparent sm:text-9xl"
        >
          404
        </p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">{c.title}</h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground">{c.text}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={c.homeHref}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-7 py-3 text-sm font-semibold text-[var(--gold-foreground)] shadow-lg transition hover:bg-[var(--gold-soft)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {c.home}
          </Link>
          <Link
            href={c.servicesHref}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-7 py-3 text-sm font-semibold transition hover:border-[var(--gold)] hover:text-[var(--gold)]"
          >
            {c.services}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </main>
      <SiteFooter />
      <WhatsAppFab />
      <CookieBanner />
    </>
  )
}

export function NotFoundPage() {
  const pathname = usePathname() || ''
  const isEnglishUrl = pathname === '/en' || pathname.startsWith('/en/')

  // En una dirección /en/... siempre en inglés; en el resto, el idioma que ya tenga el visitante.
  return isEnglishUrl ? (
    <LangOverride lang="en">
      <NotFoundBody />
    </LangOverride>
  ) : (
    <NotFoundBody />
  )
}
