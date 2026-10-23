import type { Metadata } from 'next'
import { LegalPage, H2, P, UL } from '@/components/legal-page'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Política de privacidad | Dronesur',
  description: 'Cómo trata Dronesur tus datos personales.',
}

export default function PoliticaPrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad">
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
        legales de prescripción y se eliminan.
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
    </LegalPage>
  )
}
