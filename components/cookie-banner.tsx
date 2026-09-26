'use client'

import { useEffect, useState } from 'react'
import { Cookie } from 'lucide-react'
import { useSite } from '@/components/site-provider'

const KEY = 'dronesur-cookies'

export function CookieBanner() {
  const { t } = useSite()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(KEY)) {
      const id = setTimeout(() => setVisible(true), 900)
      return () => clearTimeout(id)
    }
  }, [])

  const decide = (value: 'accepted' | 'rejected') => {
    localStorage.setItem(KEY, value)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] sm:inset-x-auto sm:left-5 sm:max-w-md">
      <div className="animate-fade-up flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t('cookies.text')}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => decide('rejected')}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground/80 transition hover:bg-muted"
          >
            {t('cookies.reject')}
          </button>
          <button
            onClick={() => decide('accepted')}
            className="rounded-full bg-[var(--gold)] px-4 py-2 text-xs font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)]"
          >
            {t('cookies.accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
