import type { Metadata } from 'next'
import { LegalPage, H2, P, UL } from '@/components/legal-page'
import { LangText } from '@/components/lang-text'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Política de privacidad | Dronesur',
  description: 'Cómo trata Dronesur tus datos personales.',
}

export default function PoliticaPrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad" titleEn="Privacy policy">
      <LangText
        es={
          <>
      <P>
        Tu privacidad nos importa. Aquí te explicamos, conforme al Reglamento General de Protección
        de Datos (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD), qué datos recogemos, para qué y qué
        derechos tienes.
      </P>

      <H2>1. Responsable del tratamiento</H2>
      <UL
        items={[
          <>Responsable: {LEGAL.titular}</>,
          <>NIF/CIF: {LEGAL.nif}</>,
          <>Domicilio: {LEGAL.domicilio}</>,
          <>Correo electrónico: {LEGAL.email}</>,
          <>Teléfono: {LEGAL.telefono}</>,
        ]}
      />

      <H2>2. Qué datos tratamos y para qué</H2>
      <UL
        items={[
          <>
            <strong>Solicitudes de presupuesto y contacto.</strong> Datos que nos facilites (por
            ejemplo, nombre, correo, teléfono y descripción del trabajo), por el canal que elijas
            (formulario, WhatsApp o correo). Finalidad: responder a tu solicitud y preparar el
            presupuesto.
          </>,
          <>
            <strong>Opiniones de clientes.</strong> Nombre, profesión o empresa (opcional),
            puntuación y texto que escribas. Finalidad: publicarlos en la sección de reseñas de la
            web.
          </>,
          <>
            <strong>Estadísticas de visitas.</strong> Solo si las aceptas en el aviso de cookies:
            datos de navegación agregados y anónimos, para entender cómo se usa la web y mejorarla.
          </>,
          <>
            <strong>Datos técnicos.</strong> Como cualquier web, el servidor recibe tu dirección IP y
            datos básicos del navegador para poder entregarte las páginas y garantizar la seguridad.
            Si envías una opinión, de tu IP guardamos únicamente una huella cifrada (no la IP en
            claro) durante 24 horas, para limitar el número de opiniones por persona y evitar el
            spam.
          </>,
        ]}
      />

      <H2>3. Base jurídica</H2>
      <UL
        items={[
          <>Aplicar medidas precontractuales a petición tuya (presupuestos y contratación).</>,
          <>Tu consentimiento (publicar tu opinión; estadísticas de visitas).</>,
          <>Nuestro interés legítimo en mantener la seguridad y el buen funcionamiento de la web.</>,
        ]}
      />

      <H2>4. Cuánto tiempo conservamos tus datos</H2>
      <P>
        Las solicitudes de presupuesto, durante el tiempo necesario para atenderlas y, si hay
        contratación, durante los plazos legales aplicables. Las opiniones, mientras estén
        publicadas o hasta que pidas su retirada. Después, los datos se bloquean durante los plazos
        legales de prescripción y se eliminan. La huella cifrada de la IP que se usa para limitar
        los envíos de opiniones se elimina automáticamente a las 24 horas.
      </P>

      <H2>5. Destinatarios y proveedores</H2>
      <P>
        No vendemos tus datos. Para que la web funcione usamos proveedores que actúan como
        encargados del tratamiento:
      </P>
      <UL
        items={[
          <>Vercel Inc. — alojamiento de la web.</>,
          <>Upstash — base de datos (opiniones y contenidos de la web).</>,
          <>
            Telegram — aviso interno al titular cuando se recibe una nueva opinión pendiente de
            revisar (incluye el nombre, la profesión o empresa y el texto que hayas escrito).
          </>,
          <>Cloudinary — almacenamiento y entrega de fotos y vídeos.</>,
          <>jsDelivr y cdnjs (Cloudflare) — librerías de los visores de fotos 360° y modelos 3D.</>,
          <>
            Sketchfab, Kuula o Matterport — solo si decides cargar un contenido interactivo
            incrustado.
          </>,
          <>
            Si nos escribes por WhatsApp, tus datos pasan también por WhatsApp (Meta), según sus
            propias condiciones.
          </>,
        ]}
      />

      <H2>6. Transferencias internacionales</H2>
      <P>
        Algunos de estos proveedores tienen sede o servidores fuera del Espacio Económico Europeo
        (por ejemplo, en Estados Unidos). Estas transferencias se apoyan en las garantías previstas
        por el RGPD, como el Marco de Privacidad de Datos UE-EE.UU. o las cláusulas contractuales
        tipo de la Comisión Europea.
      </P>

      <H2>7. Tus derechos</H2>
      <P>
        Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del
        tratamiento y portabilidad, y retirar tu consentimiento en cualquier momento, escribiendo a{' '}
        {LEGAL.email} e indicando el derecho que quieres ejercer. Si crees que no hemos tratado
        bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).
      </P>

      <H2>8. Menores</H2>
      <P>
        Esta web no está dirigida a menores de 14 años. Si eres menor de esa edad, necesitas el
        permiso de tus padres o tutores para facilitarnos datos.
      </P>

      <H2>9. Imágenes captadas durante los servicios</H2>
      <P>
        Cuando realizamos fotografía o vídeo aéreo en eventos, trabajamos por encargo del cliente y
        evitamos mostrar de forma identificable a personas concretas sin su permiso. Si apareces en
        una imagen publicada y quieres que la retiremos, escríbenos y lo haremos.
      </P>

      <H2>10. Cambios en esta política</H2>
      <P>
        Podemos actualizar esta política cuando cambie la web o la normativa. La fecha de la última
        actualización figura al principio de esta página.
      </P>
          </>
        }
        en={
          <>

      <P>
        <strong>Courtesy translation.</strong> This English version is provided for convenience. If
        there is any discrepancy, the Spanish version prevails.
      </P>
      <P>
        Your privacy matters to us. Here we explain, in accordance with the General Data Protection
        Regulation (GDPR) and Spanish Organic Law 3/2018 (LOPDGDD), what data we collect, what for
        and what rights you have.
      </P>

      <H2>1. Data controller</H2>
      <UL
        items={[
          <>Controller: {LEGAL.titular}</>,
          <>Tax ID (NIF/CIF): {LEGAL.nif}</>,
          <>Address: {LEGAL.domicilio}</>,
          <>Email: {LEGAL.email}</>,
          <>Phone: {LEGAL.telefono}</>,
        ]}
      />

      <H2>2. What data we process and why</H2>
      <UL
        items={[
          <>
            <strong>Quote and contact requests.</strong> Data you give us (for example, name,
            email, phone and a description of the job), through the channel you choose (form,
            WhatsApp or email). Purpose: to reply to your request and prepare the quote.
          </>,
          <>
            <strong>Customer reviews.</strong> Name, profession or company (optional), rating and
            the text you write. Purpose: to publish them in the reviews section of the website.
          </>,
          <>
            <strong>Visit statistics.</strong> Only if you accept them in the cookie notice:
            aggregated, anonymous browsing data, to understand how the website is used and improve
            it.
          </>,
          <>
            <strong>Technical data.</strong> Like any website, the server receives your IP address
            and basic browser data in order to deliver the pages and ensure security. If you submit
            a review, we store only an encrypted fingerprint of your IP (not the IP itself) for 24
            hours, to limit the number of reviews per person and prevent spam.
          </>,
        ]}
      />

      <H2>3. Legal basis</H2>
      <UL
        items={[
          <>Taking pre-contractual steps at your request (quotes and hiring).</>,
          <>Your consent (publishing your review; visit statistics).</>,
          <>Our legitimate interest in keeping the website secure and working properly.</>,
        ]}
      />

      <H2>4. How long we keep your data</H2>
      <P>
        Quote requests, for as long as needed to handle them and, if you hire us, for the
        applicable legal periods. Reviews, while they are published or until you ask for them to be
        removed. After that, the data is blocked for the legal limitation periods and then deleted.
        The encrypted IP fingerprint used to limit review submissions is automatically deleted after
        24 hours.
      </P>

      <H2>5. Recipients and providers</H2>
      <P>
        We do not sell your data. To make the website work we use providers that act as data
        processors:
      </P>
      <UL
        items={[
          <>Vercel Inc. — website hosting.</>,
          <>Upstash — database (reviews and website content).</>,
          <>
            Telegram — internal notice to the owner when a new review is pending approval (includes
            the name, profession or company and the text you wrote).
          </>,
          <>Cloudinary — storage and delivery of photos and videos.</>,
          <>jsDelivr and cdnjs (Cloudflare) — libraries for the 360° photo and 3D model viewers.</>,
          <>
            Sketchfab, Kuula or Matterport — only if you choose to load embedded interactive
            content.
          </>,
          <>
            If you write to us on WhatsApp, your data also passes through WhatsApp (Meta), under
            their own terms.
          </>,
        ]}
      />

      <H2>6. International transfers</H2>
      <P>
        Some of these providers are based or have servers outside the European Economic Area (for
        example, in the United States). These transfers rely on the safeguards provided by the GDPR,
        such as the EU-US Data Privacy Framework or the European Commission’s standard contractual
        clauses.
      </P>

      <H2>7. Your rights</H2>
      <P>
        You can exercise your rights of access, rectification, erasure, objection, restriction of
        processing and portability, and withdraw your consent at any time, by writing to{' '}
        {LEGAL.email} stating the right you wish to exercise. If you think we have not handled your
        data properly, you can lodge a complaint with the Spanish Data Protection Agency (aepd.es).
      </P>

      <H2>8. Minors</H2>
      <P>
        This website is not aimed at children under 14. If you are under that age, you need your
        parents’ or guardians’ permission to give us data.
      </P>

      <H2>9. Images captured during our services</H2>
      <P>
        When we take aerial photos or video at events, we work on behalf of the client and avoid
        showing identifiable individuals without their permission. If you appear in a published
        image and want us to remove it, write to us and we will do so.
      </P>

      <H2>10. Changes to this policy</H2>
      <P>
        We may update this policy when the website or the regulations change. The date of the last
        update appears at the top of this page.
      </P>
          </>
        }
      />
    </LegalPage>
  )
}
