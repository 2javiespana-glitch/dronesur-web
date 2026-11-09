import type { Metadata } from 'next'
import { HomePage } from '@/components/home-page'
import { loadHomeData } from '@/lib/home-data'

// Portada en inglés: dronesur.es/en
export const metadata: Metadata = {
  title: 'Drone Services in Almería, Granada & Málaga | Aerial Photo & Video — Dronesur',
  description:
    'Dronesur — professional drone services in Almería, Granada, Málaga, Jaén, Cádiz and Murcia (southern Spain). 4K aerial video and photography, photogrammetry, events, real estate and construction monitoring.',
  alternates: {
    canonical: '/en',
    languages: { es: '/', en: '/en', 'x-default': '/' },
  },
  openGraph: {
    title: 'Drone Services in Almería, Granada & Málaga | Dronesur',
    description:
      'We elevate the image of your project. Aerial photography and video with drones in Andalusia and Murcia.',
    url: '/en',
    type: 'website',
    siteName: 'Dronesur',
    locale: 'en_US',
    images: ['/opengraph-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Drone Services in Almería, Granada & Málaga | Dronesur',
    description:
      'We elevate the image of your project. Aerial photography and video with drones in Andalusia and Murcia.',
    images: ['/opengraph-image.jpg'],
  },
}

export const dynamic = 'force-dynamic'

export default async function EnglishHome() {
  const data = await loadHomeData()
  return <HomePage data={data} />
}
