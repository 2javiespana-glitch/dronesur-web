'use client'

import { openCookieSettings } from '@/lib/consent'
import { useSite } from '@/components/site-provider'

export function CookieSettingsButton() {
  const { lang } = useSite()
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
    >
      {lang === 'en' ? 'Change my cookie choice' : 'Cambiar mi elección de cookies'}
    </button>
  )
}
