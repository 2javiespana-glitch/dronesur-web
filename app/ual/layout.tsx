import type { Metadata } from 'next'

// La cara de la web CON la oferta de bienvenida (dronesur.es/ual), pensada para quien llega desde la universidad.
// No debe salir en Google (si no, cualquiera la encontraría buscando la empresa): no se indexa y tampoco
// está en el mapa del sitio. Todo lo que cuelga de /ual hereda esto.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function UalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
