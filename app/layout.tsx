import type { Metadata, Viewport } from 'next'
import { Inter, Manrope } from 'next/font/google'
import { Providers } from '@/components/providers'
import { AnalyticsGate } from '@/components/analytics-gate'
import { LegalLinks } from '@/components/legal-links'
import { LEGAL } from '@/lib/legal'
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
  title: 'Dronesur | Perspectivas aéreas de alto impacto en el sur de España',
  description:
    'Dronesur — Servicios profesionales de dron en Almería, Granada, Málaga, Jaén, Cádiz y Murcia. Vídeo y fotografía aérea 4K, fotogrametría, eventos, inmobiliaria y seguimiento de obra.',
  generator: 'v0.app',
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
    title: 'Dronesur | Perspectivas aéreas de alto impacto en el sur de España',
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
    var l = localStorage.getItem('dronesur-lang') || 'es';
    el.setAttribute('lang', l);
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
