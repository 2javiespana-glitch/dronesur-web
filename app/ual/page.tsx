import { HomePage } from '@/components/home-page'
import { loadHomeData } from '@/lib/home-data'

// Portada de la cara con oferta: dronesur.es/ual
// Es la misma portada que la principal y lee los mismos datos del admin (categorías, vídeos, reseñas...);
// la única diferencia es que aquí SÍ salen el banner de bienvenida, la casilla de descuento y la sección «oportunidad».
export const dynamic = 'force-dynamic'

export default async function UalHome() {
  const data = await loadHomeData({ ual: true })
  return <HomePage data={data} />
}
