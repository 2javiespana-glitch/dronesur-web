'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useQuote } from '@/components/quote-modal'
import { InstagramIcon } from '@/components/icons'
import { SITE } from '@/lib/content'

const LINKS = [
  { key: 'nav.home', href: '/#top' },
  { key: 'nav.services', href: '/#servicios' },
  { key: 'nav.promos', href: '/#promociones' },
  { key: 'nav.legal', href: '/#garantia-legal' },
  { key: 'nav.reviews', href: '/#resenas' },
  { key: 'nav.about', href: '/#sobre' },
  { key: 'nav.contact', href: '/#contacto' },
]

export function SiteHeader() {
  const { theme, toggleTheme, lang, setLang, t } = useSite()
  const { open } = useQuote()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-border bg-background/80 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/#top" className="flex items-center gap-2.5" aria-label="Dronesur inicio">
          <Image
            src="/logo-dronesur.png"
            alt="Dronesur"
            width={44}
            height={44}
            className="h-10 w-10 object-contain sm:h-11 sm:w-11"
            priority
          />
          <span className="text-lg font-bold tracking-tight">
            Drone<span className="text-gold">sur</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition hover:text-gold"
            >
              {t(l.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <a
            href={SITE.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Instagram @${SITE.instagram}`}
            className="rounded-full p-2 text-foreground/80 transition hover:bg-muted hover:text-gold"
          >
            <InstagramIcon className="h-5 w-5" />
          </a>

          <div className="flex overflow-hidden rounded-full border border-border text-xs font-semibold">
            <button
              onClick={() => setLang('es')}
              className={`px-2.5 py-1 transition ${
                lang === 'es'
                  ? 'bg-[var(--gold)] text-[var(--gold-foreground)]'
                  : 'text-foreground/70 hover:text-foreground'
              }`}
              aria-pressed={lang === 'es'}
            >
              ES
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 transition ${
                lang === 'en'
                  ? 'bg-[var(--gold)] text-[var(--gold-foreground)]'
                  : 'text-foreground/70 hover:text-foreground'
              }`}
              aria-pressed={lang === 'en'}
            >
              EN
            </button>
          </div>

          <button
            onClick={toggleTheme}
            className="rounded-full p-2 text-foreground/80 transition hover:bg-muted hover:text-gold"
            aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          <button
            onClick={() => open()}
            className="ml-1 hidden rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[var(--gold-foreground)] transition hover:bg-[var(--gold-soft)] sm:inline-flex"
          >
            {t('hero.cta')}
          </button>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-full p-2 text-foreground lg:hidden"
            aria-label="Menú"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col px-4 py-3">
            {LINKS.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-3 text-sm font-medium text-foreground/80 transition hover:bg-muted hover:text-gold"
              >
                {t(l.key)}
              </Link>
            ))}
            <button
              onClick={() => {
                setMobileOpen(false)
                open()
              }}
              className="mt-2 rounded-full bg-[var(--gold)] px-4 py-3 text-sm font-semibold text-[var(--gold-foreground)]"
            >
              {t('hero.cta')}
            </button>
          </div>
        </nav>
      )}
    </header>
  )
}
