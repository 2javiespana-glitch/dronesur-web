import type { Metadata } from 'next'
import { LegalPage, H2, P, UL } from '@/components/legal-page'
import { LangText } from '@/components/lang-text'
import { CookieSettingsButton } from '@/components/cookie-settings-button'

export const metadata: Metadata = {
  title: 'Política de cookies | Dronesur',
  description: 'Qué cookies y almacenamiento usa la web de Dronesur y cómo gestionarlos.',
}

// Lo que realmente guarda esta web en tu navegador. Si añades herramientas nuevas
// (Google Analytics, píxel de Meta, mapas de Google, vídeos de YouTube...) hay que
// añadirlas aquí y pedir consentimiento en el banner.
const ITEMS = [
  {
    name: 'dronesur-theme',
    purpose: 'Recuerda si prefieres el modo claro u oscuro.',
    type: 'Técnico (preferencia)',
    duration: 'Hasta que lo borres',
  },
  {
    name: 'dronesur-lang',
    purpose: 'Recuerda tu idioma (español o inglés).',
    type: 'Técnico (preferencia)',
    duration: 'Hasta que lo borres',
  },
  {
    name: 'dronesur-cookie-consent',
    purpose: 'Guarda tu elección sobre las cookies, para no volver a preguntarte.',
    type: 'Técnico (necesario)',
    duration: '12 meses',
  },
  {
    name: 'dronesur_desktop_notice',
    purpose: 'Evita repetir un aviso informativo durante tu visita.',
    type: 'Técnico',
    duration: 'Solo la sesión',
  },
  {
    name: 'Vercel Analytics',
    purpose:
      'Estadísticas de visitas anónimas y agregadas. Solo se activan si pulsas «Aceptar» en el aviso de cookies.',
    type: 'Analítica (opcional)',
    duration: 'Según Vercel; no usa cookies',
  },
]

// Same table in English (the website’s English version).
const ITEMS_EN = [
  {
    name: 'dronesur-theme',
    purpose: 'Remembers whether you prefer light or dark mode.',
    type: 'Technical (preference)',
    duration: 'Until you delete it',
  },
  {
    name: 'dronesur-lang',
    purpose: 'Remembers your language (Spanish or English).',
    type: 'Technical (preference)',
    duration: 'Until you delete it',
  },
  {
    name: 'dronesur-cookie-consent',
    purpose: 'Stores your cookie choice so we do not ask you again.',
    type: 'Technical (necessary)',
    duration: '12 months',
  },
  {
    name: 'dronesur_desktop_notice',
    purpose: 'Avoids repeating an informational notice during your visit.',
    type: 'Technical',
    duration: 'Session only',
  },
  {
    name: 'Vercel Analytics',
    purpose:
      'Anonymous, aggregated visit statistics. They are only activated if you click “Accept” in the cookie notice.',
    type: 'Analytics (optional)',
    duration: 'According to Vercel; does not use cookies',
  },
]

export default function PoliticaCookiesPage() {
  return (
    <LegalPage title="Política de cookies" titleEn="Cookie policy">
      <LangText
        es={
          <>
      <H2>1. ¿Qué son las cookies?</H2>
      <P>
        Las cookies y tecnologías similares (como el almacenamiento local del navegador) son
        pequeños archivos que una web guarda en tu dispositivo para recordar información. Algunas
        son imprescindibles para que la web funcione y otras son opcionales.
      </P>

      <H2>2. Qué usa esta web</H2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[34rem] text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="p-3 font-semibold">Nombre</th>
              <th className="p-3 font-semibold">Para qué sirve</th>
              <th className="p-3 font-semibold">Tipo</th>
              <th className="p-3 font-semibold">Duración</th>
            </tr>
          </thead>
          <tbody>
            {ITEMS.map((it) => (
              <tr key={it.name} className="border-t border-border align-top">
                <td className="p-3 font-mono">{it.name}</td>
                <td className="p-3">{it.purpose}</td>
                <td className="p-3">{it.type}</td>
                <td className="p-3">{it.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        El almacenamiento técnico no necesita tu consentimiento porque es imprescindible para que la
        web funcione o para recordar una elección que tú has hecho. Las estadísticas son opcionales
        y solo se activan si las aceptas.
      </P>

      <H2>3. Contenido de terceros</H2>
      <P>
        Las fotos y vídeos se sirven desde Cloudinary, y la web está alojada en Vercel. Al cargarlos,
        esos proveedores reciben datos técnicos básicos como tu dirección IP. Los enlaces a
        Instagram y WhatsApp te llevan a webs de terceros con sus propias políticas.
      </P>
      <P>
        Los visores de fotos 360° y de modelos 3D cargan sus librerías desde jsDelivr y cdnjs
        (Cloudflare), que también reciben tu dirección IP. Algunos contenidos interactivos pueden
        mostrarse desde Sketchfab, Kuula o Matterport: solo se cargan si pulsas el botón «Cargar
        contenido interactivo», y esos servicios pueden usar sus propias cookies.
      </P>

      <H2>4. Cómo cambiar o retirar tu elección</H2>
      <P>Puedes cambiar tu decisión en cualquier momento con este botón:</P>
      <div>
        <CookieSettingsButton />
      </div>
      <P>También puedes borrar los datos guardados desde los ajustes de tu navegador:</P>
      <UL
        items={[
          <>Chrome: Ajustes → Privacidad y seguridad → Cookies y otros datos de sitios.</>,
          <>Safari: Ajustes → Safari → Avanzado → Datos de sitios web.</>,
          <>Firefox: Ajustes → Privacidad y seguridad → Cookies y datos del sitio.</>,
          <>Edge: Configuración → Cookies y permisos del sitio.</>,
        ]}
      />

      <H2>5. Cambios en esta política</H2>
      <P>
        Si añadimos nuevas herramientas, actualizaremos esta página y volveremos a pedirte tu
        elección cuando proceda.
      </P>
          </>
        }
        en={
          <>

      <P>
        <strong>Courtesy translation.</strong> This English version is provided for convenience. If
        there is any discrepancy, the Spanish version prevails.
      </P>

      <H2>1. What are cookies?</H2>
      <P>
        Cookies and similar technologies (such as the browser’s local storage) are small files that
        a website saves on your device to remember information. Some are essential for the website
        to work and others are optional.
      </P>

      <H2>2. What this website uses</H2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[34rem] text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="p-3 font-semibold">Name</th>
              <th className="p-3 font-semibold">Purpose</th>
              <th className="p-3 font-semibold">Type</th>
              <th className="p-3 font-semibold">Duration</th>
            </tr>
          </thead>
          <tbody>
            {ITEMS_EN.map((it) => (
              <tr key={it.name} className="border-t border-border align-top">
                <td className="p-3 font-mono">{it.name}</td>
                <td className="p-3">{it.purpose}</td>
                <td className="p-3">{it.type}</td>
                <td className="p-3">{it.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        Technical storage does not require your consent because it is essential for the website to
        work or to remember a choice you have made. Statistics are optional and are only activated
        if you accept them.
      </P>

      <H2>3. Third-party content</H2>
      <P>
        Photos and videos are served from Cloudinary, and the website is hosted on Vercel. When
        loading them, these providers receive basic technical data such as your IP address. Links to
        Instagram and WhatsApp take you to third-party websites with their own policies.
      </P>
      <P>
        The 360° photo and 3D model viewers load their libraries from jsDelivr and cdnjs
        (Cloudflare), which also receive your IP address. Some interactive content may be displayed
        from Sketchfab, Kuula or Matterport: it is only loaded if you click the “Load interactive
        content” button, and those services may use their own cookies.
      </P>

      <H2>4. How to change or withdraw your choice</H2>
      <P>You can change your decision at any time with this button:</P>
      <div>
        <CookieSettingsButton />
      </div>
      <P>You can also delete the stored data from your browser settings:</P>
      <UL
        items={[
          <>Chrome: Settings → Privacy and security → Cookies and other site data.</>,
          <>Safari: Settings → Safari → Advanced → Website data.</>,
          <>Firefox: Settings → Privacy &amp; Security → Cookies and Site Data.</>,
          <>Edge: Settings → Cookies and site permissions.</>,
        ]}
      />

      <H2>5. Changes to this policy</H2>
      <P>
        If we add new tools, we will update this page and ask for your choice again when
        appropriate.
      </P>
          </>
        }
      />
    </LegalPage>
  )
}
