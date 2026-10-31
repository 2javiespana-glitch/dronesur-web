'use client'

import Image from 'next/image'
import { ShieldCheck, Award, MapPin, User } from 'lucide-react'
import { LEGAL } from '@/lib/legal'
import { SITE } from '@/lib/content'
import { useSite } from '@/components/site-provider'
import { type SiteContent, localizedOr, optimizeImage } from '@/lib/site-content'

// Estas líneas SOLO aparecen si el dato está de verdad rellenado en lib/legal.ts.
// Así la web nunca afirma algo (como tener seguro) que todavía no tienes.
const hasAesa = !!LEGAL.operadorAesa && !LEGAL.operadorAesa.includes('[COMPLETAR')
const hasSeguro = !!LEGAL.seguroRc && !LEGAL.seguroRc.includes('[COMPLETAR')

// El nombre, el texto y la foto los cambias desde el admin ("Sobre el piloto").
// Mientras no hayas escrito el texto, esta sección no se muestra en la web.
export function PilotSection({ content }: { content: SiteContent['pilot'] }) {
  const { lang } = useSite()
  const es = lang === 'es'

  const text = localizedOr(content.text, lang)
  if (!text) return null

  const places = SITE.coverage
  const placesText =
    places.length > 1
      ? `${places.slice(0, -1).join(', ')} ${es ? 'y' : 'and'} ${places[places.length - 1]}`
      : (places[0] ?? '')

  return (
    <section id="piloto" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold sm:text-4xl">
          {es ? 'Sobre el piloto' : 'About the pilot'}
        </h2>
        <p className="mt-3 text-muted-foreground">
          {es ? 'La persona detrás de cada vuelo.' : 'The person behind every flight.'}
        </p>
        <div className="mx-auto mt-5 h-1 w-16 rounded-full bg-[var(--gold)]" />
      </div>

      <div className="grid items-center gap-10 lg:grid-cols-2">
        {/* Foto, centrada dentro de su columna */}
        <div className="flex justify-center">
          <div className="relative h-64 w-64 overflow-hidden rounded-full border-4 border-[var(--gold)]/60 shadow-xl sm:h-80 sm:w-80">
            {content.image ? (
              <Image
                src={optimizeImage(content.image, 800)}
                alt={content.name || (es ? 'Piloto de Dronesur' : 'Dronesur pilot')}
                fill
                unoptimized
                className="object-cover"
                sizes="320px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0b0e14] to-[#1a1f2b]">
                <User className="h-24 w-24 text-white/30" />
              </div>
            )}
          </div>
        </div>

        {/* Texto */}
        <div>
          {content.name && <h3 className="text-2xl font-bold">{content.name}</h3>}
          <p className={`${content.name ? 'mt-4 ' : ''}whitespace-pre-line leading-relaxed text-muted-foreground`}>
            {text}
          </p>

          <ul className="mt-6 space-y-3">
            {hasAesa && (
              <li className="flex items-center gap-3 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)]">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                {es ? 'Operador de drones registrado en AESA' : 'Drone operator registered with AESA'} ·{' '}
                {LEGAL.operadorAesa}
              </li>
            )}
            {hasSeguro && (
              <li className="flex items-center gap-3 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)]">
                  <Award className="h-4 w-4" />
                </span>
                {es ? 'Seguro de responsabilidad civil' : 'Liability insurance'} · {LEGAL.seguroRc}
              </li>
            )}
            <li className="flex items-center gap-3 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)]">
                <MapPin className="h-4 w-4" />
              </span>
              {es ? 'Operando en ' : 'Operating in '}
              {placesText}
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
