'use client'

import Link from 'next/link'
import { Mail } from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useQuote } from '@/components/quote-modal'
import { InstagramIcon, WhatsAppIcon } from '@/components/icons'
import { SITE } from '@/lib/content'
import { LEGAL } from '@/lib/legal'

// Correo al que escribe la gente. Es el de lib/legal.ts (el mismo del aviso legal): si cambia ahí, cambia aquí.
const CONTACT_EMAIL = LEGAL.email

export function ContactSection() {
  const { t, lang } = useSite()
  const { open } = useQuote()

  return (
    <section id="contacto" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-[var(--gold)]/30 bg-gradient-to-b from-card to-background p-8 text-center sm:p-12">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{t('contact.title')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {t('contact.subtitle')}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => open({ discount: true })}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1ebe5b]"
            >
              <WhatsAppIcon className="h-5 w-5" />
              {t('contact.whatsapp')}
            </button>
            <a
              href={SITE.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-7 py-3.5 text-sm font-semibold transition hover:border-[var(--gold)] hover:text-gold"
            >
              <InstagramIcon className="h-5 w-5" />
              {t('contact.instagram')}
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-7 py-3.5 text-sm font-semibold transition hover:border-[var(--gold)] hover:text-gold"
            >
              <Mail className="h-5 w-5" />
              {lang === 'es' ? 'Escríbenos por correo' : 'Email us'}
            </a>
          </div>
          {/* La dirección escrita, por si alguien no tiene programa de correo configurado */}
          <p className="mt-5 text-sm text-muted-foreground">{CONTACT_EMAIL}</p>
        </div>
      </div>
    </section>
  )
}

export function SiteFooter() {
  const { t } = useSite()

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-10 sm:px-6 md:flex-row md:justify-between lg:px-8">
        <div className="text-center md:text-left">
          <p className="text-lg font-bold">
            Drone<span className="text-gold">sur</span>
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {t('footer.tagline')}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            aria-label={`Email ${CONTACT_EMAIL}`}
            className="rounded-full border border-border p-2.5 transition hover:border-[var(--gold)] hover:text-gold"
          >
            <Mail className="h-5 w-5" />
          </a>
          <a
            href={SITE.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Instagram @${SITE.instagram}`}
            className="rounded-full border border-border p-2.5 transition hover:border-[var(--gold)] hover:text-gold"
          >
            <InstagramIcon className="h-5 w-5" />
          </a>
          <Link
            href="/admin"
            className="text-xs font-medium text-muted-foreground transition hover:text-gold"
          >
            Admin
          </Link>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Dronesur · @{SITE.instagram} · {t('footer.rights')}
      </div>
    </footer>
  )
}
