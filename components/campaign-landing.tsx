'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/contact-footer'
import { WhatsAppFab } from '@/components/whatsapp-fab'
import { CookieBanner } from '@/components/cookie-banner'
import { LinkCarousel } from '@/components/link-carousel'
import { useSite } from '@/components/site-provider'
import { toEnglishPath } from '@/lib/i18n-routes'
import { localizedOr } from '@/lib/site-content'
import { withRef, type CampaignLink } from '@/lib/campaign-links'

// Página de aviso de un cartel (dronesur.es/<nombre>): explica la oferta y tiene un botón a la web principal.
// Solo la ve quien entra por el enlace del cartel; desde la web normal no hay forma de llegar a ella.
// El botón añade «?ref=<nombre>» para que las visitas se apunten a ese cartel.
export function CampaignLanding({ link, preview }: { link: CampaignLink; preview: boolean }) {
  const { lang } = useSite()
  const title = localizedOr(link.title, lang) || link.name
  const text = localizedOr(link.text, lang)
  const label = localizedOr(link.button, lang) || (lang === 'es' ? 'Ir a la web principal' : 'Go to the main site')
  const href = withRef(lang === 'en' ? toEnglishPath(link.target) : link.target, preview ? null : link.slug)

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-5 pb-20 pt-32 text-center">
        <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">{title}</h1>
        <div className="mt-5 h-1 w-16 rounded-full bg-[var(--gold)]" />
        <LinkCarousel media={link.media} />
        {text && <p className="mt-8 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{text}</p>}
        <Link
          href={href}
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-7 py-3.5 text-base font-semibold text-[var(--gold-foreground)] shadow-lg transition hover:bg-[var(--gold-soft)]"
        >
          {label}
          <ArrowRight className="h-5 w-5" />
        </Link>
        {preview && (
          <p className="mt-6 text-xs text-muted-foreground">
            Vista de prueba: no se ha contado como visita.
          </p>
        )}
      </main>
      <SiteFooter />
      <WhatsAppFab />
      <CookieBanner />
    </>
  )
}
