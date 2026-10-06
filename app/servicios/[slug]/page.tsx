import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { CategoryDetail } from '@/components/category-detail'
import { SiteFooter } from '@/components/contact-footer'
import { WhatsAppFab } from '@/components/whatsapp-fab'
import { CookieBanner } from '@/components/cookie-banner'
import { getCategory } from '@/lib/content'
import { readJSON } from '@/lib/kv'

// La página lee cada vez qué categorías están ocultas (panel de admin), así que no se genera fija.
export const dynamic = 'force-dynamic'

async function getHiddenCategories(): Promise<string[]> {
  try {
    const settings = await readJSON<{ hiddenCategories?: string[] }>('dronesur:settings', {})
    return Array.isArray(settings.hiddenCategories) ? settings.hiddenCategories : []
  } catch {
    return []
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const category = getCategory(slug)
  if (!category) notFound()

  // Categoría oculta desde el admin: la dirección deja de funcionar.
  const hidden = await getHiddenCategories()
  if (hidden.includes(slug)) notFound()

  return (
    <>
      <SiteHeader />
      <CategoryDetail category={category} />
      <SiteFooter />
      <WhatsAppFab />
      <CookieBanner />
    </>
  )
}
