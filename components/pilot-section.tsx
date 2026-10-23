import Image from 'next/image'
import { ShieldCheck, Award, MapPin } from 'lucide-react'
import { LEGAL } from '@/lib/legal'

// NOTA: añade tu foto como public/piloto.jpg (o cambia la ruta de abajo por la que uses).
// El texto de presentación lo editas directamente aquí abajo.
const PILOT_PHOTO = '/piloto.jpg'

// Estas líneas SOLO aparecen si el dato está de verdad rellenado en lib/legal.ts.
// Así la web nunca afirma algo (como tener seguro) que todavía no tienes.
const hasAesa = !!LEGAL.operadorAesa && !LEGAL.operadorAesa.includes('[COMPLETAR')
const hasSeguro = !!LEGAL.seguroRc && !LEGAL.seguroRc.includes('[COMPLETAR')

export function PilotSection() {
  return (
    <section id="piloto" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Sobre el piloto</h2>
        <p className="mt-3 text-muted-foreground">La persona detrás de cada vuelo.</p>
        <div className="mx-auto mt-5 h-1 w-16 rounded-full bg-[var(--gold)]" />
      </div>

      <div className="grid items-center gap-10 lg:grid-cols-2">
        {/* Foto, centrada dentro de su columna */}
        <div className="flex justify-center">
          <div className="relative h-64 w-64 overflow-hidden rounded-full border-4 border-[var(--gold)]/60 shadow-xl sm:h-80 sm:w-80">
            <Image
              src={PILOT_PHOTO}
              alt="Piloto de Dronesur"
              fill
              className="object-cover"
              sizes="320px"
            />
          </div>
        </div>

        {/* Texto */}
        <div>
          <h3 className="text-2xl font-bold">Tu nombre</h3>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Cuéntale al visitante quién eres: cómo empezaste con los drones, qué te gusta grabar y
            cómo trabajas. (Edita este texto en components/pilot-section.tsx. Escribe solo lo que
            sea cierto: la experiencia y los títulos que de verdad tienes.)
          </p>

          <ul className="mt-6 space-y-3">
            {hasAesa && (
              <li className="flex items-center gap-3 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)]">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                Operador de drones registrado en AESA · {LEGAL.operadorAesa}
              </li>
            )}
            {hasSeguro && (
              <li className="flex items-center gap-3 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)]">
                  <Award className="h-4 w-4" />
                </span>
                Seguro de responsabilidad civil · {LEGAL.seguroRc}
              </li>
            )}
            <li className="flex items-center gap-3 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)]">
                <MapPin className="h-4 w-4" />
              </span>
              Operando en Almería, Granada, Málaga, Jaén, Cádiz y Murcia
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
