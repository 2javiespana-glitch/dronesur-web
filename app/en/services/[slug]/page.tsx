import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { CategoryDetail } from '@/components/category-detail'
import { SiteFooter } from '@/components/contact-footer'
import { WhatsAppFab } from '@/components/whatsapp-fab'
import { CookieBanner } from '@/components/cookie-banner'
import { loadCategoriesSafe, loadGallery, shareImageFor } from '@/lib/page-data'

// Página de un servicio en inglés: dronesur.es/en/services/<categoría>
// Usa los mismos datos que la española; el texto en inglés sale de los campos «English» del admin
// (y si alguno está vacío, se usa el español).

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const category = (await loadCategoriesSafe()).find((c) => c.slug === slug)
  if (!category || category.visible === false) return { title: 'Page not found', robots: { index: false } }

  const name = category.title.en || category.title.es
  const title = `${name} with drone | Dronesur`
  const description = (category.short.en || category.short.es || category.description.en || category.description.es)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
  const image = await shareImageFor(slug)

  return {
    title,
    description,
    alternates: {
      canonical: `/en/services/${slug}`,
      languages: { es: `/servicios/${slug}`, en: `/en/services/${slug}`, 'x-default': `/servicios/${slug}` },
    },
    openGraph: {
      title,
      description,
      url: `/en/services/${slug}`,
      type: 'website',
      siteName: 'Dronesur',
      locale: 'en_US',
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function EnglishCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const category = (await loadCategoriesSafe()).find((c) => c.slug === slug)
  if (!category || category.visible === false) notFound()

  const { media, albums } = await loadGallery(slug)

  return (
    <>
      <SiteHeader />
      <CategoryDetail key={category.slug} category={category} initialMedia={media} initialAlbums={albums} />
      <SiteFooter />
      <WhatsAppFab />
      <CookieBanner />
    </>
  )
}
