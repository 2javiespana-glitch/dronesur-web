'use client'

import { openCookieSettings } from '@/lib/consent'

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
    >
      Cambiar mi elección de cookies
    </button>
  )
}
