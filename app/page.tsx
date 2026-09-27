'use client'

import { useState, useEffect } from 'react'
import { INITIAL_VIDEOS, type VideoItem } from '@/lib/content'
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
  const [videos, setVideos] = useState(INITIAL_VIDEOS)

  useEffect(() => {
    const saved = localStorage.getItem('dronesur_videos')
    if (saved) {
      try {
        setVideos(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  return (
    <>
      <SiteHeader />
      <main>
       v.category === 'hero')} />
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
