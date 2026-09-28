'use client'

import { useState, useEffect } from 'react'
import type { VideoItem } from '@/lib/content'
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
  const [videos, setVideos] = useState<VideoItem[]>([])

  // Lee los vídeos del servidor (los que subes desde el admin), para que los vean todos los visitantes.
  useEffect(() => {
    fetch('/api/media', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setVideos(data)
      })
      .catch(() => {})
  }, [])

  return (
    <>
      <SiteHeader />
      <main>
        <Hero videos={videos.filter((v) => v.category === 'hero' && v.type !== 'image')} />
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
