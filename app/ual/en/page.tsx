import { HomePage } from '@/components/home-page'
import { loadHomeData } from '@/lib/home-data'

// Portada en inglés de la cara con oferta: dronesur.es/ual/en
export const dynamic = 'force-dynamic'

export default async function UalEnglishHome() {
  const data = await loadHomeData({ ual: true })
  return <HomePage data={data} />
}
