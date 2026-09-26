'use client'

import { useEffect, useState } from 'react'

export type Review = {
  id: string
  name: string
  role: string
  rating: number
  text: string
}

const STORAGE_KEY = 'dronesur-reviews'
const EVENT = 'dronesur-reviews-change'

export const DEFAULT_REVIEWS: Review[] = [
  {
    id: 'r1',
    name: 'Laura Martínez',
    role: 'Agente inmobiliaria · Málaga',
    rating: 5,
    text: 'Las tomas aéreas de las villas revalorizaron los anuncios al instante. Vendimos dos propiedades en tiempo récord. Profesionalidad total.',
  },
  {
    id: 'r2',
    name: 'Carlos Ruiz',
    role: 'Novio · Granada',
    rating: 5,
    text: 'El vídeo de nuestra boda desde el aire nos dejó sin palabras. Un recuerdo único y una edición preciosa. ¡Gracias Dronesur!',
  },
  {
    id: 'r3',
    name: 'Constructora Sur SL',
    role: 'Promotora · Almería',
    rating: 5,
    text: 'Seguimiento de obra impecable, entregas puntuales y material perfecto para nuestros informes mensuales. Repetiremos seguro.',
  },
  {
    id: 'r4',
    name: 'Hotel Costa Luz',
    role: 'Dirección · Cádiz',
    rating: 5,
    text: 'Renovamos toda la imagen del hotel con sus vídeos 4K. El resultado en redes ha sido espectacular y muy por encima de lo esperado.',
  },
  {
    id: 'r5',
    name: 'Javier Ortega',
    role: 'Ingeniero topógrafo · Jaén',
    rating: 5,
    text: 'La fotogrametría y las mediciones fueron precisas y llegaron en 48 horas como prometieron. Un servicio técnico de primer nivel.',
  },
  {
    id: 'r6',
    name: 'Marina López',
    role: 'Event planner · Murcia',
    rating: 5,
    text: 'Trabajar con ellos es facilísimo: se encargan de permisos, coordinación y entrega. El toque aéreo eleva cualquier evento.',
  },
]

function read(): Review[] {
  if (typeof window === 'undefined') return DEFAULT_REVIEWS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_REVIEWS
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return DEFAULT_REVIEWS
  } catch {
    return DEFAULT_REVIEWS
  }
}

function write(reviews: Review[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews))
  window.dispatchEvent(new Event(EVENT))
}

export function useReviews() {
  const [reviews, setReviews] = useState<Review[]>(DEFAULT_REVIEWS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sync = () => setReviews(read())
    sync()
    setReady(true)
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const addReview = (review: Omit<Review, 'id'>) => {
    const next = [...read(), { ...review, id: `r-${Date.now()}` }]
    write(next)
  }

  const updateReview = (id: string, patch: Partial<Omit<Review, 'id'>>) => {
    const next = read().map((r) => (r.id === id ? { ...r, ...patch } : r))
    write(next)
  }

  const deleteReview = (id: string) => {
    write(read().filter((r) => r.id !== id))
  }

  const resetReviews = () => write(DEFAULT_REVIEWS)

  return { reviews, ready, addReview, updateReview, deleteReview, resetReviews }
}
