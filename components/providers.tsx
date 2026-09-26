'use client'

import { SiteProvider } from '@/components/site-provider'
import { QuoteProvider } from '@/components/quote-modal'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SiteProvider>
      <QuoteProvider>{children}</QuoteProvider>
    </SiteProvider>
  )
}
