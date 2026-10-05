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
import { PilotSection } from '@/components/pilot-section'
import { ContactSection, SiteFooter } from '@/components/contact-footer'
import { WhatsAppFab } from '@/components/whatsapp-fab'
import { CookieBanner } from '@/components/cookie-banner'

type SiteSettings = {
  promo: boolean
  coverage: boolean
  guarantee: boolean
  reviews: boolean
  legal: boolean
  about: boolean
  pilot: boolean
}

const DEFAULT_SETTINGS: SiteSettings = {
  promo: true,
  coverage: true,
  guarantee: true,
  reviews: true,
  legal: true,
  about: true,
  pilot: true,
}

export default function HomePage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)

  // Lee los vídeos del servidor (los que subes desde el admin), para que los vean todos los visitantes.
  useEffect(() => {
    fetch('/api/media', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setVideos(data)
      })
      .catch(() => {})
  }, [])

  // Lee qué secciones deben mostrarse (lo que eliges en el admin, "Qué se ve en la web").
  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object') setSettings({ ...DEFAULT_SETTINGS, ...data })
      })
      .catch(() => {})
  }, [])

  return (
    <>
      <SiteHeader />
      <main>
        <Hero videos={videos.filter((v) => v.category === 'hero' && v.type !== 'image')} />
        {settings.promo && <WelcomePromo />}
        <Categories />
        {settings.coverage && <CoverageServices />}
        {settings.guarantee && <GuaranteeBanner />}
        {settings.reviews && <ReviewsSection />}
        {settings.legal && <LegalSection />}
        {settings.about && <AboutSection />}
        {settings.pilot && <PilotSection />}
        <ContactSection />
      </main>
      <SiteFooter />
      <WhatsAppFab />
      <CookieBanner />
    </>
  )
}
