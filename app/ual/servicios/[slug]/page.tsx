import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { CategoryDetail } from '@/components/category-detail'
import { SiteFooter } from '@/components/contact-footer'
import { WhatsAppFab } from '@/components/whatsapp-fab'
import { CookieBanner } from '@/components/cookie-banner'
import { loadCategoriesSafe, loadGallery } from '@/lib/page-data'

// Página de un servicio en la cara con oferta: dronesur.es/ual/servicios/<categoría>
// Lee exactamente las mismas categorías, fotos y vídeos que la de la web principal: lo que subas aparece en las dos.
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const category = (await loadCategoriesSafe()).find((c) => c.slug === slug)
  if (!category || category.visible === false) return { title: 'Página no encontrada' }
  return { title: `${category.title.es} con dron | Dronesur` }
}

export default async function UalCategoryPage({
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
      <CategoryDetail key={category.slug} category={category} initialMedia={media} initialAlbums={albums} />
      <SiteFooter />
      <WhatsAppFab />
      <CookieBanner />
    </>
  )
}
