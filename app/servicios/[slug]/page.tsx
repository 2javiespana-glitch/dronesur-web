import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { CategoryDetail } from '@/components/category-detail'
import { SiteFooter } from '@/components/contact-footer'
import { WhatsAppFab } from '@/components/whatsapp-fab'
import { CookieBanner } from '@/components/cookie-banner'
import { CATEGORIES, type Category } from '@/lib/content'
import { readCategories } from '@/lib/categories-db'

// La página lee cada vez las categorías guardadas desde el panel de admin (crear / ocultar),
// así que no se genera fija.
export const dynamic = 'force-dynamic'

async function loadCategories(): Promise<Category[]> {
  try {
    return await readCategories()
  } catch {
    // Si la base de datos no responde, la web sigue funcionando con las categorías de siempre.
    return CATEGORIES
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const categories = await loadCategories()
  const category = categories.find((c) => c.slug === slug)

  // Si no existe, o está oculta desde el admin, la dirección deja de funcionar.
  if (!category || category.visible === false) notFound()

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
