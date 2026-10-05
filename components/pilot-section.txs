import Image from 'next/image'
import { ShieldCheck, Award, MapPin } from 'lucide-react'

// NOTA: añade tu foto como public/piloto.jpg (o cambia la ruta de abajo por la que uses).
// El texto de ejemplo también lo puedes editar directamente aquí.
const PILOT_PHOTO = '/piloto.jpg'

export function PilotSection() {
  return (
    <section id="piloto" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Sobre el piloto</h2>
        <p className="mt-3 text-muted-foreground">
          La persona detrás de cada vuelo.
        </p>
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
          <h3 className="text-2xl font-bold">Nombre del piloto</h3>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Piloto profesional de drones certificado, con experiencia en fotografía y
            vídeo aéreo en Andalucía y Murcia. (Edita este texto en{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
              components/pilot-section.tsx
            </code>{' '}
            para contar tu propia historia: cómo empezaste, cuántos vuelos llevas, qué
            tipo de proyectos te gusta hacer...)
          </p>

          <ul className="mt-6 space-y-3">
            <li className="flex items-center gap-3 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)]">
                <ShieldCheck className="h-4 w-4" />
              </span>
              Certificado AESA — piloto habilitado para operaciones con dron
            </li>
            <li className="flex items-center gap-3 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)]">
                <Award className="h-4 w-4" />
              </span>
              Seguro de responsabilidad civil en vigor
            </li>
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
