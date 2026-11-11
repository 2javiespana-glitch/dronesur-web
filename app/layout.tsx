import type { Metadata, Viewport } from 'next'
import { Inter, Manrope } from 'next/font/google'
import { Providers } from '@/components/providers'
import { AnalyticsGate } from '@/components/analytics-gate'
import { LegalLinks } from '@/components/legal-links'
import { LEGAL } from '@/lib/legal'
import { businessJsonLd, jsonLd } from '@/lib/seo'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  // Dirección base para que la imagen de vista previa salga completa al compartir el enlace.
  // Se toma de lib/legal.ts: cámbiala allí cuando tengas dominio propio.
  metadataBase: new URL(`https://${LEGAL.web}`),
  // El título que sale en Google: lleva el servicio y las ciudades principales.
  title: 'Dron en Almería, Granada y Málaga | Foto y vídeo aéreo — Dronesur',
  description:
    'Dronesur — Servicios profesionales de dron en Almería, Granada, Málaga, Jaén, Cádiz y Murcia. Vídeo y fotografía aérea 4K, fotogrametría, eventos, inmobiliaria y seguimiento de obra.',
  keywords: [
    'dron',
    'drone',
    'fotografía aérea',
    'vídeo aéreo',
    'fotogrametría',
    'Andalucía',
    'AESA',
    'Dronesur',
  ],
  openGraph: {
    title: 'Dron en Almería, Granada y Málaga | Foto y vídeo aéreo — Dronesur',
    description:
      'Elevamos la imagen de tu proyecto. Fotografía y vídeo aéreo con dron en Andalucía y Murcia.',
    type: 'website',
    siteName: 'Dronesur',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f6' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0d0d' },
  ],
}

const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('dronesur-theme') || 'dark';
    var el = document.documentElement;
    el.classList.remove('light','dark');
    el.classList.add(t);
    // El idioma lo marca la dirección: /en... en inglés, el resto en español.
    var p = location.pathname;
    el.setAttribute('lang', p === '/en' || p.indexOf('/en/') === 0 ? 'en' : 'es');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`dark ${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Datos estructurados: le explican a Google qué es Dronesur y dónde trabaja (no se ven en la web). */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(businessJsonLd()) }} />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
          <LegalLinks />
        </Providers>
        <AnalyticsGate />
      </body>
    </html>
  )
}
