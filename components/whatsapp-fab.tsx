'use client'

import { useSite } from '@/components/site-provider'
import { useQuote } from '@/components/quote-modal'
import { WhatsAppIcon } from '@/components/icons'

export function WhatsAppFab() {
  const { open } = useQuote()
  const { lang } = useSite()

  return (
    <button
      onClick={() => open()}
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] py-3 pl-3.5 pr-4 text-white shadow-xl transition hover:scale-105 hover:bg-[#1ebe5b]"
      aria-label={lang === 'es' ? 'Pedir presupuesto por WhatsApp' : 'Request a WhatsApp quote'}
    >
      <WhatsAppIcon className="h-6 w-6" />
      <span className="hidden text-sm font-semibold sm:inline">
        {lang === 'es' ? 'Presupuesto' : 'Get a quote'}
      </span>
      <span className="absolute right-1 top-1 flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--gold)]" />
      </span>
    </button>
  )
}
