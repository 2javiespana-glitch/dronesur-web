// Recuento de visitas POR HORA (hora de Madrid), para saber qué día y a qué hora llegan las visitas a la web y
// se abren los carteles. Igual de anónimo que los contadores por día: solo se suma «1» a un número, nunca se
// guarda IP, huella ni ningún dato de la persona. Lo comparten las rutas que apuntan (visitas y carteles), la ruta
// que lo lee para el admin y el panel que lo dibuja.
//
// Se guarda un contador por día y por hora, en tres claves (cada una se reinicia donde ya se reiniciaba lo suyo):
//   · web  → dronesur:hour:web:AAAA-MM-DD    campo «HH»        visitas a la web (solo quien acepta estadísticas)
//   · ref  → dronesur:hour:ref:AAAA-MM-DD    campo «cartel|HH» visitas a la web que llegan con «?ref=cartel»
//   · scan → dronesur:hour:scan:AAAA-MM-DD   campo «cartel|HH» aperturas del enlace (dronesur.es/cartel)
// Se conservan ~13 meses, como los contadores por día.

export const HOURLY_TTL = 400 * 24 * 60 * 60
export const HOUR_WEB_KEY = (day: string) => `dronesur:hour:web:${day}`
export const HOUR_REF_KEY = (day: string) => `dronesur:hour:ref:${day}`
export const HOUR_SCAN_KEY = (day: string) => `dronesur:hour:scan:${day}`

// Día (AAAA-MM-DD) y hora (0-23) en Madrid, sacados del MISMO instante para que nunca se descuadren a medianoche.
export function madridDayHour(now: Date = new Date()): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return { day: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 }
}

export const hh = (hour: number) => String(hour).padStart(2, '0')
export const refField = (slug: string, hour: number) => `${slug}|${hh(hour)}`
// Los 24 campos de un cartel en un día (para poder reiniciarlo con un solo comando).
export const refFieldsOfDay = (slug: string) => Array.from({ length: 24 }, (_, h) => refField(slug, h))

export type HourlyDay = { date: string; hours: number[]; total: number }
export type Hourly = {
  total: number
  byHour: number[] // 24 valores: la suma de todos los días del periodo, por hora
  byDay: HourlyDay[] // el día más reciente primero
  peakHour: { hour: number; count: number } | null
  peakDay: { date: string; count: number } | null
}

// Convierte lo que devuelve HGETALL de cada día (lista plana [campo, valor, campo, valor...]) en totales por hora.
// «pick» dice a qué hora (0-23) corresponde un campo, o null si hay que ignorarlo (por ejemplo, otro cartel).
export function buildHourly(dates: string[], flats: unknown[], pick: (field: string) => number | null): Hourly {
  const byHour = Array.from({ length: 24 }, () => 0)
  const byDay: HourlyDay[] = dates.map((date, i) => {
    const hours = Array.from({ length: 24 }, () => 0)
    const flat = flats[i]
    if (Array.isArray(flat)) {
      for (let k = 0; k + 1 < flat.length; k += 2) {
        const hour = pick(String(flat[k]))
        const n = Number(flat[k + 1]) || 0
        if (hour === null || n <= 0) continue
        hours[hour] += n
        byHour[hour] += n
      }
    }
    return { date, hours, total: hours.reduce((s, n) => s + n, 0) }
  })
  const total = byHour.reduce((s, n) => s + n, 0)
  let peakHour: Hourly['peakHour'] = null
  byHour.forEach((count, hour) => {
    if (count > 0 && (!peakHour || count > peakHour.count)) peakHour = { hour, count }
  })
  let peakDay: Hourly['peakDay'] = null
  for (const d of byDay) if (d.total > 0 && (!peakDay || d.total > peakDay.count)) peakDay = { date: d.date, count: d.total }
  return { total, byHour, byDay, peakHour, peakDay }
}

// Campo «HH» → hora, o null si no es una hora válida.
export function hourOf(text: string): number | null {
  if (!/^\d{2}$/.test(text)) return null
  const h = Number(text)
  return h >= 0 && h < 24 ? h : null
}
