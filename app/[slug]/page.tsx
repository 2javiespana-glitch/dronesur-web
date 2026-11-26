import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { CampaignLanding } from '@/components/campaign-landing'
import { readJSONPublic, redis } from '@/lib/kv'
import {
  LINKS_KEY,
  SCANS_KEY,
  SCANS_TTL,
  normalizeLinks,
  validateSlug,
  withRef,
  type CampaignLink,
} from '@/lib/campaign-links'
import type { MediaItem } from '@/lib/media-admin'
import { resolveLinkMedia } from '@/lib/shared-carousels'
import { HOURLY_TTL, HOUR_SCAN_KEY, madridDayHour, refField } from '@/lib/hourly-stats'

// Enlaces de carteles, tarjetas y QR: dronesur.es/<nombre>, creados desde el admin («Carteles y enlaces»).
// Según cómo se haya creado cada uno:
//   · «Ir directo»: lleva a la web principal (o a la página que hayas elegido) sin enseñar nada antes.
//   · «Página de aviso»: enseña primero un texto (la oferta del cartel) con un botón hacia la web.
// En los dos casos se cuenta una apertura y la web principal recibe «?ref=<nombre>» para saber qué cartel trae visitas.
// Las direcciones que no existen, o los enlaces desactivados, dan el 404 de siempre. Las páginas reales de la web
// (/admin, /servicios..., etc.) no pasan por aquí: Next.js da prioridad a las que existen.

export const dynamic = 'force-dynamic'

const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|curl|wget/i

async function findLink(rawSlug: string): Promise<CampaignLink | null> {
  const slug = rawSlug.toLowerCase()
  // Si no tiene forma de enlace válido (p. ej. «wp-login.php»), ni se consulta la base de datos.
  if (validateSlug(slug)) return null
  try {
    const links = normalizeLinks(await readJSONPublic<unknown>(LINKS_KEY, []))
    return links.find((l) => l.slug === slug && l.active) ?? null
  } catch {
    return null
  }
}

// Suma una apertura al contador del día. Sin IP ni datos personales. Si falla, no pasa nada.
async function countOpening(slug: string) {
  try {
    const ua = (await headers()).get('user-agent') || ''
    if (!ua || BOT_RE.test(ua)) return
    const { day, hour } = madridDayHour()
    const key = SCANS_KEY(day)
    await redis(['HINCRBY', key, slug, '1'])
    await redis(['EXPIRE', key, String(SCANS_TTL)])
    // Y también por hora (hora de Madrid), para ver a qué hora se abre cada cartel.
    await redis(['HINCRBY', HOUR_SCAN_KEY(day), refField(slug, hour), '1'])
    await redis(['EXPIRE', HOUR_SCAN_KEY(day), String(HOURLY_TTL)])
  } catch {
    // Se ignora a propósito: contar nunca debe impedir que el enlace funcione.
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const link = await findLink((await params).slug)
  if (!link) return { robots: { index: false, follow: false } }
  // Estas páginas son para quien llega desde el cartel: no deben salir en Google.
  return {
    title: `${link.title.es || link.name} | Dronesur`,
    robots: { index: false, follow: false },
  }
}

export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const link = await findLink((await params).slug)
  if (!link) notFound()

  // «?prueba=1» (el botón «Probar» del admin): se ve igual, pero no suma ninguna apertura ni marca visita.
  const preview = (await searchParams).prueba !== undefined
  if (!preview) await countOpening(link.slug)

  if (link.mode === 'redirect') redirect(withRef(link.target, preview ? null : link.slug))

  // Fotos y vídeos propios del cartel + los de los carruseles de la web que tenga marcados en el admin.
  // Solo se lee la lista de la web si hay algún carrusel marcado. Si falla la lectura, salen solo los propios.
  let items: MediaItem[] = []
  if (link.carousels.length > 0) {
    try {
      const saved = await readJSONPublic<unknown>('dronesur:media', [])
      items = Array.isArray(saved) ? (saved as MediaItem[]) : []
    } catch {
      items = []
    }
  }
  const media = resolveLinkMedia(link, items)

  return <CampaignLanding link={{ ...link, media }} preview={preview} />
}
