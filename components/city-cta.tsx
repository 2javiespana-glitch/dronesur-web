'use client'

import { useQuote } from '@/components/quote-modal'
import { WhatsAppIcon } from '@/components/icons'

// Botón de "Pedir presupuesto" de las páginas de ciudad: abre el formulario con la ciudad ya puesta.
export function CityCta({ city }: { city: string }) {
  const { open } = useQuote()
  return (
    <button
      type="button"
      onClick={() => open({ location: city, discount: true })}
      className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1ebe5b]"
    >
      <WhatsAppIcon className="h-5 w-5" />
      Pedir presupuesto en {city}
    </button>
  )
}
