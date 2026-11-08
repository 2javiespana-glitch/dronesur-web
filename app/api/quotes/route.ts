import { NextResponse } from 'next/server'
import { readJSON, updateJSON, writeJSON, redis, clientHash } from '@/lib/kv'
import { fail, serverError, requireAdmin } from '@/lib/api'
import { notifyTelegram } from '@/lib/telegram'
import { SITE_URL } from '@/lib/seo'
import {
  DEFAULT_QUOTES_CONFIG,
  type Quote,
  type QuoteStatus,
  type QuotesConfig,
} from '@/lib/quotes'

// Solicitudes de presupuesto.
// Cuando alguien rellena el formulario y pulsa «WhatsApp» o «Correo», la solicitud se guarda aquí
// y te llega un aviso por Telegram, aunque la persona no llegue a enviar el mensaje.
//
// - GET ?config=1  -> { enabled }  (público: el formulario lo usa para saber si avisa de que se guarda)
// - GET            -> { quotes, config }  (solo admin)
// - POST { action: 'submit', quote }               cualquier visitante (se guarda si está activado)
// - POST { action: 'setConfig', config }           admin: activar / desactivar la función
// - POST { action: 'status', id, status }          admin: nueva / contactada / cerrada
// - DELETE { id }                                  admin: borrar una solicitud

export const dynamic = 'force-dynamic'

const KEY = 'dronesur:quotes'
const CONFIG_KEY = 'dronesur:quotes:config'
const MAX_STORED = 500
const MAX_PER_HOUR = 30 // por conexión. Es generoso a propósito: en una universidad comparten la misma IP.
const STATUSES: QuoteStatus[] = ['new', 'contacted', 'closed']

async function readConfig(): Promise<QuotesConfig> {
  try {
    const stored = await readJSON<Partial<QuotesConfig> | null>(CONFIG_KEY, null)
    return { enabled: typeof stored?.enabled === 'boolean' ? stored.enabled : DEFAULT_QUOTES_CONFIG.enabled }
  } catch {
    return DEFAULT_QUOTES_CONFIG
  }
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

// ----- Filtro de avisos de Telegram -----
// La solicitud se guarda siempre (se ve en /admin), pero el aviso por Telegram solo se manda
// si hay un contacto válido o una solicitud con contenido real. Así una sola letra no te avisa.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function hasValidContact(c: string): boolean {
  if (EMAIL_RE.test(c)) return true
  return /^\+?[\d\s().-]+$/.test(c) && c.replace(/\D/g, '').length >= 9
}

function worthNotifying(q: Quote): boolean {
  if (hasValidContact(q.contact)) return true
  return !!q.service && q.location.length >= 3 && q.details.length >= 15
}

// Datos técnicos para reconocer al visitante SIN guardar ni enviar su IP:
// zona aproximada (la da Vercel), tipo de dispositivo y un ID corto (huella de la conexión).
function visitorInfo(req: Request) {
  const h = req.headers
  let city = h.get('x-vercel-ip-city') || ''
  try {
    city = decodeURIComponent(city)
  } catch {
    // Se deja tal cual.
  }
  const region = h.get('x-vercel-ip-country-region') || ''
  const ua = h.get('user-agent') || ''
  return {
    place: [city, region].filter(Boolean).join(', ') || '—',
    device: /mobile|android|iphone/i.test(ua) ? 'móvil' : 'ordenador',
    id: clientHash(req).slice(0, 8), // mismo ID = misma conexión
  }
}

// Evita avisos repetidos de la misma conexión durante 10 minutos.
async function firstNoticeRecently(req: Request): Promise<boolean> {
  try {
    const res = await redis(['SET', `dronesur:quotes:notified:${clientHash(req)}`, '1', 'EX', '600', 'NX'])
    return res === 'OK'
  } catch {
    return true // si falla la base de datos, mejor avisar que quedarse callado
  }
}

async function underRateLimit(req: Request): Promise<boolean> {
  const key = `dronesur:quotes:rl:${clientHash(req)}`
  await redis(['SET', key, '0', 'EX', '3600', 'NX'])
  return Number(await redis(['INCR', key])) <= MAX_PER_HOUR
}

// El mensaje que te llega por Telegram. Lleva lo que la persona escribió en el formulario
// y, aparte, zona aproximada, dispositivo e ID corto. Nunca su dirección IP.
function telegramText(q: Quote, req: Request): string {
  const v = visitorInfo(req)
  const when = new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Madrid',
  }).format(new Date(q.createdAt))
  return (
    `Nueva solicitud de presupuesto\n` +
    `(puede que el cliente aún no haya enviado el mensaje por ${q.channel === 'email' ? 'correo' : 'WhatsApp'})\n\n` +
    `Servicio: ${q.service || '—'}\n` +
    `Zona: ${q.location || '—'}\n` +
    `Detalles: ${q.details || '—'}\n` +
    `Contacto: ${q.contact || 'no ha dejado ninguno'}\n` +
    `Descuento de bienvenida: ${q.discount ? 'sí' : 'no'}\n` +
    `Idioma: ${q.lang.toUpperCase()} · ${when}\n` +
    `Zona aprox.: ${v.place} · ${v.device} · ID ${v.id}\n\n` +
    `Verlas todas en: ${SITE_URL}/admin`
  )
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  if (url.searchParams.get('config') === '1') {
    const config = await readConfig()
    return NextResponse.json({ enabled: config.enabled }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const denied = await requireAdmin(req)
  if (denied) return denied
  try {
    const quotes = await readJSON<Quote[]>(KEY, [])
    quotes.sort((a, b) => b.createdAt - a.createdAt)
    return NextResponse.json({ quotes, config: await readConfig() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: Request) {
  let body: {
    action?: string
    quote?: Record<string, unknown>
    config?: Record<string, unknown>
    id?: string
    status?: string
  }
  try {
    body = await req.json()
  } catch {
    return fail('Petición no válida', 400)
  }

  // ----- Público: guardar una solicitud -----
  if (body.action === 'submit') {
    const input = body.quote ?? {}
    // Cuadro escondido en el formulario: una persona no lo ve ni lo rellena, un programa spam sí.
    if (text(input.website, 200)) return NextResponse.json({ ok: true, saved: false })

    try {
      const config = await readConfig()
      if (!config.enabled) return NextResponse.json({ ok: true, saved: false })

      const quote: Quote = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
        service: text(input.service, 120),
        location: text(input.location, 120),
        details: text(input.details, 1000),
        contact: text(input.contact, 120),
        discount: input.discount === true,
        lang: input.lang === 'en' ? 'en' : 'es',
        channel: input.channel === 'email' ? 'email' : 'whatsapp',
        status: 'new',
      }
      // Un formulario completamente vacío no vale la pena guardarlo.
      if (!quote.service && !quote.location && !quote.details && !quote.contact) {
        return NextResponse.json({ ok: true, saved: false })
      }
      if (!(await underRateLimit(req))) return fail('Demasiadas solicitudes seguidas. Inténtalo más tarde.', 429)

      await updateJSON<Quote[]>(KEY, [], (quotes) => [...quotes, quote].slice(-MAX_STORED))
      if (worthNotifying(quote) && (await firstNoticeRecently(req))) {
        await notifyTelegram(telegramText(quote, req))
      }
      return NextResponse.json({ ok: true, saved: true })
    } catch (e) {
      return serverError(e)
    }
  }

  // ----- Admin -----
  const denied = await requireAdmin(req)
  if (denied) return denied

  if (body.action === 'setConfig') {
    try {
      const config: QuotesConfig = { enabled: body.config?.enabled === true }
      await writeJSON(CONFIG_KEY, config)
      return NextResponse.json({ config })
    } catch (e) {
      return serverError(e)
    }
  }

  if (body.action === 'status') {
    const status = STATUSES.find((s) => s === body.status)
    if (!body.id || !status) return fail('Datos no válidos.', 400)
    try {
      const quotes = await updateJSON<Quote[]>(KEY, [], (list) =>
        list.map((q) => (q.id === body.id ? { ...q, status } : q)),
      )
      return NextResponse.json({ quotes: quotes.sort((a, b) => b.createdAt - a.createdAt) })
    } catch (e) {
      return serverError(e)
    }
  }

  return fail('Acción no válida', 400)
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  try {
    const { id } = await req.json()
    const quotes = await updateJSON<Quote[]>(KEY, [], (list) => list.filter((q) => q.id !== id))
    return NextResponse.json({ quotes: quotes.sort((a, b) => b.createdAt - a.createdAt) })
  } catch (e) {
    return serverError(e)
  }
}
