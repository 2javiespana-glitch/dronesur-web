'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useQuote } from '@/components/quote-modal'
import { InstagramIcon } from '@/components/icons'
import { SITE, type Lang } from '@/lib/content'
import { alternatePath } from '@/lib/i18n-routes'
import { useLocalePath } from '@/components/use-locale-path'

// Claves de /api/settings que controlan secciones con enlace en el menú.
type SectionKey = 'promo' | 'guarantee' | 'reviews' | 'legal' | 'about'
type VisibilitySettings = Partial<Record<SectionKey, boolean>>

// `section` es la clave del panel de admin que controla ese enlace.
// Sin `section`, el enlace se muestra siempre (Inicio, Servicios, Contacto).
const LINKS: { key: string; href: string; section?: SectionKey }[] = [
  { key: 'nav.home', href: '/#top' },
  { key: 'nav.services', href: '/#servicios' },
  { key: 'nav.promos', href: '/#promociones', section: 'promo' },
  { key: 'nav.legal', href: '/#garantia-legal', section: 'legal' },
  { key: 'nav.reviews', href: '/#resenas', section: 'reviews' },
  { key: 'nav.about', href: '/#sobre', section: 'about' },
  { key: 'nav.contact', href: '/#contacto' },
]

// `sections`: qué secciones están visibles. La portada ya las tiene y se las pasa; en el resto de
// páginas la cabecera las pide a /api/public-sections (una respuesta pequeña que se guarda 1 minuto).
export function SiteHeader({ sections }: { sections?: VisibilitySettings } = {}) {
  const { theme, toggleTheme, lang, setLang, t } = useSite()
  const localePath = useLocalePath()
  const pathname = usePathname()
  const router = useRouter()

  // Cambiar de idioma: si la página tiene versión en el otro idioma, se va a ella (cada idioma tiene su
  // propia dirección, /en/...); si no (por ejemplo, las páginas legales), solo cambia el texto.
  const switchLang = (next: Lang) => {
    setLang(next)
    const target = alternatePath(pathname, next)
    if (target && target !== pathname) router.push(target)
  }
  const { open } = useQuote()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settings, setSettings] = useState<VisibilitySettings>(sections ?? {})

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lee qué secciones están visibles (lo mismo que usa la página principal).
  useEffect(() => {
    if (sections) return
    let cancelled = false
    fetch('/api/public-sections')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setSettings(data)
      })
      .catch(() => {
        // Si falla, se dejan todos los enlaces visibles.
      })
    return () => {
      cancelled = true
    }
  }, [sections])

  // Un enlace se oculta solo si su sección está explícitamente en false.
  const visibleLinks = LINKS.filter((l) => !l.section || settings[l.section] !== false)

  // Sin scroll, la cabecera tiene un fondo oscuro FIJO (en modo claro y oscuro), así que el texto
  // debe ser claro. Con scroll, el fondo sigue al tema y el texto usa los colores del tema.
  const onDark = !scrolled
  const textStrong = onDark ? 'text-white' : 'text-foreground'
  const textSoft = onDark ? 'text-white/85' : 'text-foreground/80'
  const textDim = onDark ? 'text-white/70 hover:text-white' : 'text-foreground/70 hover:text-foreground'
  const hoverBg = onDark ? 'hover:bg-white/10' : 'hover:bg-muted'
  const borderCls = onDark ? 'border-white/25' : 'border-border'

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-border bg-background/80 backdrop-blur-xl'
          : 'border-b border-white/10 bg-[#0b0e14]/90 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={localePath('/#top')} className="flex items-center gap-2.5" aria-label={lang === 'es' ? 'Dronesur inicio' : 'Dronesur home'}>
          <Image
            src="/logo-dronesur.png"
            alt="Dronesur"
            width={44}
            height={44}
            className="h-10 w-10 object-contain sm:h-11 sm:w-11"
            priority
          />
          <span className={`text-lg font-bold tracking-tight ${textStrong}`}>
            Drone<span className="text-gold">sur</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {visibleLinks.map((l) => (
            <Link
              key={l.key}
              href={localePath(l.href)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition hover:text-gold ${textSoft}`}
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
            className={`rounded-full p-2 transition hover:text-gold ${textSoft} ${hoverBg}`}
          >
            <InstagramIcon className="h-5 w-5" />
          </a>

          <div className={`flex overflow-hidden rounded-full border text-xs font-semibold ${borderCls}`}>
            <button
              onClick={() => switchLang('es')}
              className={`px-2.5 py-1 transition ${
                lang === 'es'
                  ? 'bg-[var(--gold)] text-[var(--gold-foreground)]'
                  : textDim
              }`}
              aria-pressed={lang === 'es'}
            >
              ES
            </button>
            <button
              onClick={() => switchLang('en')}
              className={`px-2.5 py-1 transition ${
                lang === 'en'
                  ? 'bg-[var(--gold)] text-[var(--gold-foreground)]'
                  : textDim
              }`}
              aria-pressed={lang === 'en'}
            >
              EN
            </button>
          </div>

          <button
            onClick={toggleTheme}
            className={`rounded-full p-2 transition hover:text-gold ${textSoft} ${hoverBg}`}
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
            className={`rounded-full p-2 lg:hidden ${textStrong}`}
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
            {visibleLinks.map((l) => (
              <Link
                key={l.key}
                href={localePath(l.href)}
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
