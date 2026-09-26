import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { WelcomePromo } from '@/components/welcome-promo'
import { Categories } from '@/components/categories'
import { CoverageServices } from '@/components/coverage-services'
import { GuaranteeBanner } from '@/components/guarantee-banner'
import { ReviewsSection } from '@/components/reviews-section'
import { LegalSection } from '@/components/legal-section'
import { AboutSection } from '@/components/about-section'
import { ContactSection, SiteFooter } from '@/components/contact-footer'
import { WhatsAppFab } from '@/components/whatsapp-fab'
import { CookieBanner } from '@/components/cookie-banner'

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <WelcomePromo />
        <Categories />
        <CoverageServices />
        <GuaranteeBanner />
        <ReviewsSection />
        <LegalSection />
        <AboutSection />
        <ContactSection />
      </main>
      <SiteFooter />
      <WhatsAppFab />
      <CookieBanner />
    </>
  )
}
