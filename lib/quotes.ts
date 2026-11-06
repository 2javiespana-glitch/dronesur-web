// Tipos de las solicitudes de presupuesto guardadas (las usan la API y el panel del admin).

export type QuoteStatus = 'new' | 'contacted' | 'closed'

export type Quote = {
  id: string
  createdAt: number
  service: string
  location: string
  details: string
  contact: string // teléfono o correo que dejó el cliente (puede ir vacío)
  discount: boolean // pidió el descuento de bienvenida
  lang: 'es' | 'en'
  channel: 'whatsapp' | 'email' // el botón que pulsó
  status: QuoteStatus
}

// enabled = false: el formulario sigue abriendo WhatsApp/correo como siempre,
// pero no se guarda nada ni se avisa por Telegram.
export type QuotesConfig = { enabled: boolean }

export const DEFAULT_QUOTES_CONFIG: QuotesConfig = { enabled: true }

// Casilla del descuento de bienvenida que aparece en el formulario de presupuesto.
// Se controla desde el admin (apartado «Casilla de descuento del formulario»).
// - enabled: false = la casilla no se muestra y nunca se pide descuento en el mensaje
// - label*: texto de la casilla. En blanco = el texto de siempre (el de lib/content.ts, clave wa.discount)
// - message*: frase que se añade al mensaje de WhatsApp/correo. En blanco = la de siempre
export type QuoteDiscount = {
  enabled: boolean
  labelEs: string
  labelEn: string
  messageEs: string
  messageEn: string
}

export const DEFAULT_QUOTE_DISCOUNT: QuoteDiscount = {
  enabled: true,
  labelEs: '',
  labelEn: '',
  messageEs: '',
  messageEn: '',
}

// Frases de siempre, que se usan mientras el admin no escriba otras.
export const FALLBACK_DISCOUNT_MESSAGE = {
  es: 'Solicito aplicar el 15% de descuento de bienvenida (nuevo cliente).',
  en: 'I request the 15% welcome discount (new client).',
}

// Limpia lo que llegue (de la base de datos, del admin o de una petición a mano):
// solo se aceptan los campos conocidos, con su tipo y una longitud razonable.
export function normalizeQuoteDiscount(raw: unknown): QuoteDiscount {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, 200) : '')
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : DEFAULT_QUOTE_DISCOUNT.enabled,
    labelEs: str(r.labelEs),
    labelEn: str(r.labelEn),
    messageEs: str(r.messageEs),
    messageEn: str(r.messageEn),
  }
}
