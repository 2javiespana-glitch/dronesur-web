'use client'

import { SiteProvider } from '@/components/site-provider'
import { QuoteProvider } from '@/components/quote-modal'
import { AccessibilityProvider } from '@/components/accessibility-provider'
import { AccessibilityPanel, SkipLink } from '@/components/accessibility-panel'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SiteProvider>
      <AccessibilityProvider>
        <SkipLink />
        <QuoteProvider>{children}</QuoteProvider>
        <AccessibilityPanel />
      </AccessibilityProvider>
    </SiteProvider>
  )
}
