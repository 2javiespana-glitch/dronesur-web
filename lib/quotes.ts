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
