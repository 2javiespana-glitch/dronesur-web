'use client'

import type { HomeData } from '@/lib/home-data'
import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { WelcomePromo } from '@/components/welcome-promo'
import { Categories } from '@/components/categories'
import { CoverageServices } from '@/components/coverage-services'
import { GuaranteeBanner } from '@/components/guarantee-banner'
import { ReviewsSection } from '@/components/reviews-section'
import { LegalSection } from '@/components/legal-section'
import { AboutSection } from '@/components/about-section'
import { PilotSection } from '@/components/pilot-section'
import { ContactSection, SiteFooter } from '@/components/contact-footer'
import { WhatsAppFab } from '@/components/whatsapp-fab'
import { CookieBanner } from '@/components/cookie-banner'

// La portada. La usan la versión en español (/) y la inglesa (/en); el idioma lo decide la dirección.
// Los datos (vídeos, categorías, secciones visibles, textos del admin) llegan ya leídos desde el
// servidor (ver lib/home-data.ts): ya no se piden uno a uno después de abrir la página.
export function HomePage({ data }: { data: HomeData }) {
  const { videos, covers, categories, settings, promoOverride, content } = data

  return (
    <>
      <SiteHeader sections={settings} />
      <main>
        <Hero videos={videos} music={content.music.url} />
        {settings.promo && <WelcomePromo override={promoOverride} />}
        <Categories categories={categories} covers={covers} />
        {settings.about && <AboutSection content={content.about} />}
        {settings.pilot && <PilotSection content={content.pilot} />}
        {settings.coverage && <CoverageServices />}
        {settings.legal && <LegalSection />}
        {settings.guarantee && <GuaranteeBanner />}
        {settings.reviews && <ReviewsSection />}
        <ContactSection />
      </main>
      <SiteFooter />
      <WhatsAppFab />
      <CookieBanner />
    </>
  )
}
