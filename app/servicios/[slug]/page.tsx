import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { CategoryDetail } from '@/components/category-detail'
import { SiteFooter } from '@/components/contact-footer'
import { WhatsAppFab } from '@/components/whatsapp-fab'
import { CookieBanner } from '@/components/cookie-banner'
import { loadCategoriesSafe, loadGallery, shareImageFor } from '@/lib/page-data'

// La página lee cada vez las categorías y las fotos guardadas desde el panel de admin,
// así que no se genera fija.
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const category = (await loadCategoriesSafe()).find((c) => c.slug === slug)
  if (!category || category.visible === false) return { title: 'Página no encontrada', robots: { index: false } }

  const title = `${category.title.es} con dron | Dronesur`
  const description = (category.short.es || category.description.es).replace(/\s+/g, ' ').trim().slice(0, 160)
  const image = await shareImageFor(slug) // su portada, o la imagen general de la web

  return {
    title,
    description,
    alternates: {
      canonical: `/servicios/${slug}`,
      languages: { es: `/servicios/${slug}`, en: `/en/services/${slug}`, 'x-default': `/servicios/${slug}` },
    },
    openGraph: {
      title,
      description,
      url: `/servicios/${slug}`,
      type: 'website',
      siteName: 'Dronesur',
      locale: 'es_ES',
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const category = (await loadCategoriesSafe()).find((c) => c.slug === slug)

  // Si no existe, o está oculta desde el admin, la dirección deja de funcionar.
  if (!category || category.visible === false) notFound()

  const { media, albums } = await loadGallery(slug)

  return (
    <>
      <SiteHeader />
      <CategoryDetail category={category} initialMedia={media} initialAlbums={albums} />
      <SiteFooter />
      <WhatsAppFab />
      <CookieBanner />
    </>
  )
}
