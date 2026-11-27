import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { CategoryDetail } from '@/components/category-detail'
import { SiteFooter } from '@/components/contact-footer'
import { WhatsAppFab } from '@/components/whatsapp-fab'
import { CookieBanner } from '@/components/cookie-banner'
import { loadCategoriesSafe, loadGallery } from '@/lib/page-data'

// Página de un servicio en inglés de la cara con oferta: dronesur.es/ual/en/services/<categoría>
// Mismos datos que la de la web principal; el texto en inglés sale de los campos «English» del admin.
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const category = (await loadCategoriesSafe()).find((c) => c.slug === slug)
  if (!category || category.visible === false) return { title: 'Page not found' }
  return { title: `${category.title.en || category.title.es} with drone | Dronesur` }
}

export default async function UalEnglishCategoryPage({
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
