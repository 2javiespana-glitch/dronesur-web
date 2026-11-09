import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/contact-footer'
import { WhatsAppFab } from '@/components/whatsapp-fab'
import { CookieBanner } from '@/components/cookie-banner'
import { CityCta } from '@/components/city-cta'
import { CATEGORIES, type Category } from '@/lib/content'
import { readCategoriesPublic } from '@/lib/categories-db'
import { readJSONPublic } from '@/lib/kv'
import { CITIES, findCity } from '@/lib/cities'
import { normalizeContent } from '@/lib/site-content'
import { SITE_URL, businessJsonLd, jsonLd } from '@/lib/seo'

// Página de una ciudad: dronesur.es/dron/<ciudad>
// Solo existe cuando has escrito su texto en el admin ("Páginas por ciudad").
// Sin texto devuelve "no encontrada" y no aparece en el mapa del sitio: así nunca se publica
// una página vacía o repetida con solo el nombre de la ciudad cambiado, que Google penaliza.

export const dynamic = 'force-dynamic'

async function loadTexts(): Promise<Record<string, string>> {
  try {
    return normalizeContent(await readJSONPublic<unknown>('dronesur:content', null)).cities
  } catch {
    return {}
  }
}

async function loadCategories(): Promise<Category[]> {
  try {
    return await readCategoriesPublic()
  } catch {
    return CATEGORIES
  }
}

// Resumen de una frase larga para la descripción que sale bajo el título en Google.
function summary(text: string, max: number) {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  return flat.slice(0, max).replace(/\s+\S*$/, '') + '…'
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>
}): Promise<Metadata> {
  const { city: slug } = await params
  const city = findCity(slug)
  const text = city ? (await loadTexts())[slug] : ''
  if (!city || !text) return { title: 'Página no encontrada', robots: { index: false } }

  const title = `Dron en ${city.name}: fotografía y vídeo aéreo | Dronesur`
  const description = summary(text, 155)
  return {
    title,
    description,
    alternates: { canonical: `/dron/${slug}` },
    openGraph: {
      title,
      description,
      url: `/dron/${slug}`,
      type: 'website',
      siteName: 'Dronesur',
      locale: 'es_ES',
      images: ['/opengraph-image.jpg'], // la imagen que se ve al compartir el enlace
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/opengraph-image.jpg'] },
  }
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params
  const city = findCity(slug)
  const texts = await loadTexts()
  const text = city ? texts[slug] : ''
  if (!city || !text) notFound()

  const categories = (await loadCategories()).filter((c) => c.visible !== false)
  const others = CITIES.filter((c) => c.slug !== slug && texts[c.slug])

  const jsonData = {
    ...businessJsonLd({
      url: `${SITE_URL}/dron/${slug}`,
      areaServed: [city.name],
      description: summary(text, 200),
    }),
    '@id': `${SITE_URL}/dron/${slug}#negocio`,
  }

  return (
    <>
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(jsonData) }} />

      <main className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gold">Servicio de dron</p>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">
          Fotografía y vídeo con dron en {city.name}
        </h1>
        <div className="mt-5 h-1 w-16 rounded-full bg-[var(--gold)]" />
        <p className="mt-8 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{text}</p>

        <h2 className="mt-14 text-2xl font-bold">Qué podemos hacer en {city.name}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/servicios/${c.slug}`}
              className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-[var(--gold)]"
            >
              <h3 className="font-bold">{c.title.es}</h3>
              {c.short.es && <p className="mt-1.5 text-sm text-muted-foreground">{c.short.es}</p>}
              {c.price.es && <p className="mt-3 text-sm font-semibold text-gold">{c.price.es}</p>}
            </Link>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-6 sm:p-8">
          <h2 className="text-xl font-bold">¿Tienes un proyecto en {city.name}?</h2>
          <p className="mt-2 text-muted-foreground">
            Cuéntanos qué necesitas y te preparamos un presupuesto sin compromiso.
          </p>
          <div className="mt-5">
            <CityCta city={city.name} />
          </div>
        </div>

        {others.length > 0 && (
          <p className="mt-10 text-sm text-muted-foreground">
            También trabajamos en:{' '}
            {others.map((c, i) => (
              <span key={c.slug}>
                {i > 0 && ', '}
                <Link href={`/dron/${c.slug}`} className="underline underline-offset-2 hover:text-gold">
                  {c.name}
                </Link>
              </span>
            ))}
            .
          </p>
        )}
      </main>

      <SiteFooter />
      <WhatsAppFab />
      <CookieBanner />
    </>
  )
}
