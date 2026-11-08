import { NextResponse } from 'next/server'
import { CATEGORIES as SEED_CATEGORIES, DEFAULT_INCLUDE_KEYS, type Category, type Localized } from '@/lib/content'
import { updateJSON } from '@/lib/kv'
import { CATEGORIES_KEY, readCategories } from '@/lib/categories-db'
import { fail, serverError, requireAdmin } from '@/lib/api'

// Categorías de servicio (las tarjetas de la portada y sus subpáginas /servicios/<slug>).
// Se pueden crear y ocultar desde el panel de admin.
//
// - GET  -> devuelve todas las categorías (pública; la portada oculta las que tengan visible=false)
// - POST -> { action: 'add', category: { title, short, description, price } }  crea una (solo admin)
//           { action: 'update', slug, category: { visible?, title?, short?, description?, price?, includes?, defaultIncludes? } }
//                                                                              edita una (solo admin)
//
// No hay "borrar" a propósito: para quitar una categoría se oculta, y así no se pierde
// ninguna foto ni vídeo que tuviera dentro.

export const dynamic = 'force-dynamic'

const RESERVED_SLUGS = ['hero', 'admin', 'api']

function slugify(text: string) {
  const slug = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^cover-/, '') // "cover-" está reservado para las portadas
    .slice(0, 40)
    .replace(/-+$/g, '')
  return slug || 'categoria'
}

function uniqueSlug(base: string, taken: string[]) {
  const used = new Set([...taken, ...RESERVED_SLUGS])
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

// Limpia un texto bilingüe. Si falta la versión en inglés, se reutiliza la española
// para que la web en inglés nunca muestre un hueco vacío.
// "Qué incluye": llega como texto con una línea por punto y se guarda como lista.
// Máximo 10 puntos de 160 caracteres. Si el inglés está vacío, se usa el español.
function cleanLines(input: unknown): { es: string[]; en: string[] } | undefined {
  const obj = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const toList = (value: unknown) =>
    String(value ?? '')
      .split('\n')
      .map((line) => line.trim().slice(0, 160))
      .filter(Boolean)
      .slice(0, 10)
  const es = toList(obj.es)
  const en = toList(obj.en)
  if (es.length === 0 && en.length === 0) return undefined
  return { es, en: en.length > 0 ? en : es }
}

// Casillas de los puntos «de siempre»: solo se aceptan las claves conocidas (sin repetir).
function cleanDefaultIncludes(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) return undefined
  return DEFAULT_INCLUDE_KEYS.filter((key) => input.includes(key))
}

function cleanLocalized(input: unknown, max: number): Localized {
  const obj = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const es = String(obj.es ?? '').trim().slice(0, max)
  const en = String(obj.en ?? '').trim().slice(0, max) || es
  return { es, en }
}

export async function GET() {
  try {
    return NextResponse.json(await readCategories(), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    // Si la base de datos aún no está conectada, la web no se rompe: se usan las de siempre.
    return NextResponse.json(SEED_CATEGORIES)
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  let body: { action?: string; slug?: string; category?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return fail('Petición no válida', 400)
  }

  if (body.action === 'add') {
    const input = body.category ?? {}
    const title = cleanLocalized(input.title, 120)
    if (!title.es) return fail('Ponle al menos un título en español.', 400)

    try {
      const categories = await updateJSON<Category[]>(CATEGORIES_KEY, SEED_CATEGORIES, (current) => {
        const slug = uniqueSlug(
          slugify(title.es),
          current.map((c) => c.slug),
        )
        const created: Category = {
          slug,
          // La foto de portada real se sube desde el admin (categoría "Portada — ...").
          // Mientras tanto se ve una imagen genérica.
          image: '/placeholder.svg',
          gallery: [],
          price: cleanLocalized(input.price, 80),
          title,
          short: cleanLocalized(input.short, 300),
          description: cleanLocalized(input.description, 4000),
          visible: true,
        }
        const includes = cleanLines(input.includes)
        if (includes) created.includes = includes
        const defaultIncludes = cleanDefaultIncludes(input.defaultIncludes)
        if (defaultIncludes) created.defaultIncludes = defaultIncludes
        return [...current, created]
      })
      return NextResponse.json({ categories })
    } catch (e) {
      return serverError(e)
    }
  }

  if (body.action === 'update') {
    const slug = String(body.slug ?? '')
    const input = body.category ?? {}
    if (!slug) return fail('Falta la categoría.', 400)

    try {
      const categories = await updateJSON<Category[]>(CATEGORIES_KEY, SEED_CATEGORIES, (current) => {
        if (!current.some((c) => c.slug === slug)) throw new Error('NOT_FOUND')
        return current.map((c) => {
          if (c.slug !== slug) return c
          const next: Category = { ...c }
          if (typeof input.visible === 'boolean') next.visible = input.visible
          if (input.title) {
            const title = cleanLocalized(input.title, 120)
            if (title.es) next.title = title
          }
          if (input.short) next.short = cleanLocalized(input.short, 300)
          if (input.description) next.description = cleanLocalized(input.description, 4000)
          if (input.includes) {
            const includes = cleanLines(input.includes)
            if (includes) next.includes = includes
            else delete next.includes // vacío = sin puntos propios
          }
          const defaultIncludes = cleanDefaultIncludes(input.defaultIncludes)
          if (defaultIncludes) next.defaultIncludes = defaultIncludes
          if (input.price) next.price = cleanLocalized(input.price, 80)
          return next
        })
      })
      return NextResponse.json({ categories })
    } catch (e) {
      if (e instanceof Error && e.message === 'NOT_FOUND') return fail('Esa categoría no existe.', 404)
      return serverError(e)
    }
  }

  return fail('Acción no válida', 400)
}
