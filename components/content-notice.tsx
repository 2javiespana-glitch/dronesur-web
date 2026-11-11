import { Copyright } from 'lucide-react'
import { LEGAL } from '@/lib/legal'

// Aviso de que todo el material de la web es propio. Se usa en dos sitios:
//  - variant="bar":   una línea discreta bajo los enlaces legales (sale en todas las páginas).
//  - variant="album": un pequeño mensaje al entrar en cada carpeta/álbum de una categoría
//                     (mismo estilo que la letra pequeña de la promoción).
// El símbolo (®) sale de lib/legal.ts (simboloMarca): se cambia en un único sitio.

const BRAND = `Dronesur${LEGAL.simboloMarca}`

const TEXT = {
  bar: {
    es: `${BRAND} · Todos los vídeos y fotografías de esta web han sido grabados por Dronesur. No se utiliza material externo.`,
    en: `${BRAND} · All videos and photographs on this website were recorded by Dronesur. No third-party material is used.`,
  },
  album: {
    es: `Todo el contenido de este álbum ha sido grabado por ${BRAND}. No se permite su uso, copia ni difusión para otros fines, ni por parte de empresas ni de particulares, sin consentimiento previo y por escrito.`,
    en: `All content in this album was recorded by ${BRAND}. Its use, copying or distribution for any other purpose, by companies or private individuals alike, is not permitted without prior written consent.`,
  },
}

export function OwnershipNotice({
  en,
  variant,
  className = '',
}: {
  en: boolean
  variant: 'bar' | 'album'
  className?: string
}) {
  const text = en ? TEXT[variant].en : TEXT[variant].es

  if (variant === 'bar') {
    return (
      <p
        className={`mx-auto max-w-2xl text-pretty text-[11px] leading-relaxed text-muted-foreground/80 ${className}`}
      >
        {text}
      </p>
    )
  }

  return (
    <p
      className={`flex items-start gap-2 text-pretty rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground ${className}`}
    >
      <Copyright className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gold)]" aria-hidden="true" />
      <span>{text}</span>
    </p>
  )
}
