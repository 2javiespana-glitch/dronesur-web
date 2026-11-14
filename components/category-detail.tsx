'use client'

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Box,
  Folder as FolderIcon,
  Globe,
  Play,
} from 'lucide-react'
import { useSite } from '@/components/site-provider'
import { useQuote } from '@/components/quote-modal'
import { WhatsAppIcon } from '@/components/icons'
import { DEFAULT_INCLUDE_KEYS, type Category } from '@/lib/content'
import type { MediaItem } from '@/lib/media-admin'
import { useLocalePath } from '@/components/use-locale-path'
import { albumVideoUrl, thumbUrl } from '@/lib/media-url'
import { PanoramaViewer } from '@/components/panorama-viewer'
import { Model3DViewer } from '@/components/model-3d-viewer'
import { EmbedViewer } from '@/components/embed-viewer'
import { OwnershipNotice } from '@/components/content-notice'

type GalleryKind = 'image' | 'video' | 'panorama' | 'model3d' | 'embed'
type GalleryItem = { id: string; url: string; type: GalleryKind; alt?: string; altEn?: string }
type Album = { id: string; category: string; title: string; createdAt: number }
type Folder = { id: string; title: string; items: GalleryItem[] }

// Cloudinary puede generar una foto de portada de cualquier vídeo cambiando la extensión a .jpg
function videoThumb(url: string) {
  if (!url.includes('res.cloudinary.com')) return null
  return url.replace(/\.[a-z0-9]+(\?.*)?$/i, '.jpg')
}

// Imagen pequeña para representar cada elemento (null = no hay, se muestra un icono).
function previewOf(item: GalleryItem): string | null {
  if (item.type === 'video') return videoThumb(item.url)
  if (item.type === 'panorama') return thumbUrl(item.url)
  if (item.type === 'image') return item.url
  return null
}

function kindLabel(type: GalleryKind, es: boolean) {
  if (type === 'video') return es ? 'Vídeo' : 'Video'
  if (type === 'panorama') return es ? 'Foto 360°' : '360° photo'
  if (type === 'model3d') return es ? 'Modelo 3D' : '3D model'
  if (type === 'embed') return es ? 'Contenido interactivo' : 'Interactive content'
  return es ? 'Imagen' : 'Image'
}

function toKind(type?: string): GalleryKind {
  if (type === 'image' || type === 'panorama' || type === 'model3d' || type === 'embed') return type
  return 'video' // los elementos antiguos sin tipo eran vídeos
}

function toGalleryItem(m: MediaItem): GalleryItem {
  return { id: m.id, url: m.url, type: toKind(m.type), alt: m.alt, altEn: m.altEn }
}

// Ordena las fotos/vídeos y álbumes de UNA categoría (los sueltos, y los de cada álbum).
function buildGallery(allMedia: MediaItem[], allAlbums: Album[], slug: string) {
  const forCategory = allMedia.filter((m) => m.category === slug)
  return {
    custom: forCategory.map(toGalleryItem),
    looseItems: forCategory.filter((m) => !m.albumId).map(toGalleryItem),
    albums: allAlbums.filter((a) => a.category === slug),
    mediaByAlbum: forCategory.reduce<Record<string, GalleryItem[]>>((acc, m) => {
      if (m.albumId) acc[m.albumId] = [...(acc[m.albumId] ?? []), toGalleryItem(m)]
      return acc
    }, {}),
  }
}

// initialMedia / initialAlbums llegan ya desde el servidor: así las fotos (y su descripción) están en el
// HTML que lee Google, en vez de aparecer solo después de cargar la página.
export function CategoryDetail({
  category,
  initialMedia,
  initialAlbums,
}: {
  category: Category
  initialMedia?: MediaItem[]
  initialAlbums?: Album[]
}) {
  const { t, tl, lang } = useSite()
  const es = lang === 'es'
  const localePath = useLocalePath()
  const { open } = useQuote()
  const [index, setIndex] = useState(0)
  const [gallery] = useState(() =>
    buildGallery(initialMedia ?? [], initialAlbums ?? [], category.slug),
  )
  const { custom, looseItems, albums, mediaByAlbum } = gallery
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  // Vídeos para los que la copia en máxima calidad no se pudo preparar: se usa el archivo original.
  const [originalVideo, setOriginalVideo] = useState<Record<string, boolean>>({})

  // La descripción de una foto en el idioma de la página (la del otro idioma si falta).
  const altOf = (item: GalleryItem) => (lang === 'en' ? item.altEn || item.alt || '' : item.alt || '')

  // Las fotos, vídeos y álbumes de esta categoría llegan ya leídos desde el servidor (initialMedia e
  // initialAlbums), siempre al día. Antes, además, se volvían a pedir TODOS los de la web al abrir la
  // página (dos peticiones más, con la lista completa); ya no hace falta. Cuando se cambia de
  // categoría, la página se vuelve a montar con sus datos (ver key={slug} en las páginas).

  const folders: Folder[] = [
    ...(looseItems.length > 0 ? [{ id: '__general__', title: 'General', items: looseItems }] : []),
    ...albums.map((a) => ({ id: a.id, title: a.title, items: mediaByAlbum[a.id] ?? [] })),
  ]
  const hasFolders = folders.length > 0
  const selectedFolder = folders.find((f) => f.id === selectedFolderId) ?? null

  // Si todavía no has subido nada para esta categoría, se muestran las fotos de ejemplo.
  const fallback: GalleryItem[] = (category.gallery.length ? category.gallery : [category.image]).map(
    (url, i) => ({ id: `static-${i}`, url, type: 'image' as const }),
  )

  // Qué se ve en el visor grande: el álbum elegido, o (si no hay álbumes en absoluto)
  // el comportamiento de siempre: lo que hayas subido suelto, o si no, las fotos de ejemplo.
  const items = hasFolders ? selectedFolder?.items ?? [] : custom.length > 0 ? custom : fallback
  const current = items[Math.min(index, Math.max(items.length - 1, 0))]

  const next = () => setIndex((i) => (i + 1) % items.length)
  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length)

  // Los puntos con «tick»: primero los «de siempre» que estén marcados en el admin y después los propios
  // de la categoría. Por defecto no hay ninguno marcado.
  const ownIncludes = category.includes ? (lang === 'en' ? category.includes.en : category.includes.es) : []
  const defaultKeys = category.defaultIncludes ?? []
  const included: string[] = [
    ...DEFAULT_INCLUDE_KEYS.filter((key) => defaultKeys.includes(key)).map((key) => t(key)),
    ...ownIncludes,
  ]

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      <Link
        href={localePath('/#servicios')}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('cat.back')}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('cat.gallery')}
          </h2>

          {/* Carpetas (álbumes): solo aparecen si has creado alguna desde el admin */}
          {hasFolders && (
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {folders.map((f) => {
                const coverItem = f.items[0]
                const cover = coverItem ? previewOf(coverItem) : null
                const isSelected = selectedFolderId === f.id
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSelectedFolderId(f.id)
                      setIndex(0)
                    }}
                    className={`group relative flex flex-col overflow-hidden rounded-xl border-2 bg-muted text-left transition ${
                      isSelected ? 'border-[var(--gold)]' : 'border-border hover:border-[var(--gold)]/50'
                    }`}
                  >
                    <div className="relative aspect-video w-full bg-black/20">
                      {cover ? (
                        <img
                          src={cover}
                          alt={coverItem ? altOf(coverItem) : ''}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <FolderIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 transition group-hover:bg-black/10" />
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-2">
                      <FolderIcon className="h-3.5 w-3.5 shrink-0 text-[var(--gold)]" />
                      <span className="truncate text-xs font-semibold">{f.title}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                        {f.items.length}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Al entrar en una carpeta: aviso de que el contenido es propio y no se puede usar sin permiso */}
          {selectedFolder && <OwnershipNotice en={!es} variant="album" className="mb-4" />}

          {/* Visor grande: si hay carpetas pero no se ha elegido ninguna, se pide elegir */}
          {hasFolders && !selectedFolder ? (
            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-border text-center text-sm text-muted-foreground">
              {es ? 'Elige un álbum arriba para ver sus fotos y vídeos' : 'Choose an album above to see its photos and videos'}
            </div>
          ) : items.length === 0 ? (
            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-border text-center text-sm text-muted-foreground">
              {es ? 'Este álbum todavía no tiene contenido' : 'This album has no content yet'}
            </div>
          ) : (
            <>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-black">
                {current.type === 'video' ? (
                  <video
                    key={current.id}
                    src={originalVideo[current.id] ? current.url : albumVideoUrl(current.url)}
                    onError={() => {
                      // Si falla la copia en máxima calidad, se prueba con el archivo original (una sola vez).
                      if (!originalVideo[current.id] && albumVideoUrl(current.url) !== current.url) {
                        setOriginalVideo((o) => ({ ...o, [current.id]: true }))
                      }
                    }}
                    className="h-full w-full object-contain"
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                  />
                ) : current.type === 'panorama' ? (
                  <div key={current.id} className="absolute inset-0">
                    <PanoramaViewer url={current.url} />
                  </div>
                ) : current.type === 'model3d' ? (
                  <div key={current.id} className="absolute inset-0">
                    <Model3DViewer url={current.url} label={tl(category.title)} />
                  </div>
                ) : current.type === 'embed' ? (
                  <div key={current.id} className="absolute inset-0">
                    <EmbedViewer url={current.url} label={tl(category.title)} />
                  </div>
                ) : (
                  <img
                    key={current.id}
                    src={current.url || '/placeholder.svg'}
                    alt={altOf(current) || `${tl(category.title)} ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                )}

                {items.length > 1 && (
                  <>
                    <button
                      onClick={prev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-black/40 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
                      aria-label={t('hero.prev')}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={next}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-black/40 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
                      aria-label={t('hero.next')}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {(current.type === 'panorama' || current.type === 'model3d') && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {es
                    ? 'Arrastra para girar · rueda del ratón o pellizco para acercar'
                    : 'Drag to rotate · mouse wheel or pinch to zoom'}
                </p>
              )}

              {items.length > 1 && (
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {items.map((item, i) => {
                    const thumb = previewOf(item)
                    return (
                      <button
                        key={item.id}
                        onClick={() => setIndex(i)}
                        className={`relative aspect-video overflow-hidden rounded-lg border-2 bg-muted transition ${
                          i === index ? 'border-[var(--gold)]' : 'border-transparent opacity-70'
                        }`}
                        aria-label={`${kindLabel(item.type, es)} ${i + 1}`}
                      >
                        {thumb && (
                          <img
                            src={thumb}
                            alt={altOf(item)}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        )}
                        {item.type === 'video' && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="h-6 w-6 fill-white text-white" />
                          </span>
                        )}
                        {item.type === 'panorama' && (
                          <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                            <Globe className="h-3 w-3" />
                            360°
                          </span>
                        )}
                        {(item.type === 'model3d' || item.type === 'embed') && (
                          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 text-white">
                            <Box className="h-6 w-6" />
                            <span className="text-[10px] font-bold">
                              {item.type === 'model3d' ? '3D' : es ? 'Interactivo' : 'Interactive'}
                            </span>
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Info */}
        <div>
          {/* Insignia de precio: solo si has puesto uno en el admin. */}
          {tl(category.price).trim() && (
            <span className="inline-block rounded-full bg-[var(--gold)] px-4 py-1.5 text-sm font-bold text-[var(--gold-foreground)]">
              {tl(category.price)}
            </span>
          )}
          <h1 className={`${tl(category.price).trim() ? 'mt-4 ' : ''}text-3xl font-extrabold sm:text-4xl`}>{tl(category.title)}</h1>
          <p className="mt-5 whitespace-pre-line leading-relaxed text-muted-foreground">
            {tl(category.description)}
          </p>

          {included.length > 0 && (
            <ul className="mt-7 space-y-3">
              {included.map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)]">
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="text-sm text-foreground/90">{line}</span>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={() => open({ service: tl(category.title), discount: true })}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1ebe5b]"
          >
            <WhatsAppIcon className="h-5 w-5" />
            {t('cat.quote')}
          </button>
        </div>
      </div>
    </main>
  )
}
