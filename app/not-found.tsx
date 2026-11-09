import type { Metadata } from 'next'
import { NotFoundPage } from '@/components/not-found-page'

// Next.js usa este archivo para TODAS las páginas que no existen (404): direcciones inventadas y
// categorías ocultas. El contenido está en components/not-found-page.tsx.
export const metadata: Metadata = {
  title: '404 | Dronesur',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return <NotFoundPage />
}
