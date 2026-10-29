import Link from 'next/link'
import type { Metadata } from 'next'
import { LegalPage, H2, P, UL, dateEn, ivaEn } from '@/components/legal-page'
import { LangText } from '@/components/lang-text'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Aviso legal | Dronesur',
  description: 'Aviso legal e información del titular de la web de Dronesur.',
}

export default function AvisoLegalPage() {
  return (
    <LegalPage title="Aviso legal" titleEn="Legal notice">
      <LangText
        es={
          <>
      <H2>1. Datos identificativos del titular</H2>
      <P>
        En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la
        Información y de Comercio Electrónico (LSSI-CE), se informa de que el titular de este sitio
        web es:
      </P>
      <UL
        items={[
          <>Titular: {LEGAL.titular}</>,
          <>NIF/CIF: {LEGAL.nif}</>,
          <>Domicilio: {LEGAL.domicilio}</>,
          <>Correo electrónico: {LEGAL.email}</>,
          <>Teléfono: {LEGAL.telefono}</>,
          <>Sitio web: {LEGAL.web}</>,
          <>Actividad: {LEGAL.actividad}</>,
          ...(LEGAL.registroMercantil ? [<>Registro mercantil: {LEGAL.registroMercantil}</>] : []),
          ...(LEGAL.operadorAesa ? [<>Operador de drones (AESA): {LEGAL.operadorAesa}</>] : []),
        ]}
      />

      <H2>2. Objeto y aceptación</H2>
      <P>
        Este aviso regula el acceso y el uso del sitio web {LEGAL.web}. Navegar por él implica que
        aceptas estas condiciones. Si no estás de acuerdo con ellas, te pedimos que no uses la web.
      </P>

      <H2>3. Condiciones de uso</H2>
      <P>
        Te comprometes a usar la web conforme a la ley, a la buena fe y al orden público. En
        particular, queda prohibido:
      </P>
      <UL
        items={[
          <>Realizar actividades ilícitas o contrarias a los derechos de terceros.</>,
          <>
            Introducir virus, código dañino o cualquier elemento que pueda dañar, sobrecargar o
            interrumpir la web o sus servidores.
          </>,
          <>
            Intentar acceder a zonas restringidas (por ejemplo, el panel de administración) o
            eludir las medidas de seguridad, incluidos los límites de envío del formulario de
            opiniones.
          </>,
          <>
            Usar programas automáticos (bots, scrapers) para extraer contenidos de la web o para
            enviar formularios de forma masiva.
          </>,
          <>
            Publicar contenidos ofensivos, falsos o que vulneren derechos de terceros, suplantar a
            otra persona o incluir datos personales de otras personas sin su permiso.
          </>,
          <>
            Usar los datos personales de otras personas que aparezcan en la web (por ejemplo, el
            nombre y la profesión o empresa de quienes dejan una opinión) para enviar publicidad o
            comunicaciones comerciales, hacer llamadas de venta, elaborar listas de contactos o
            cualquier otro fin distinto de leer la web.
          </>,
        ]}
      />
      <P>
        Si incumples estas condiciones, el titular podrá retirar los contenidos afectados, bloquear
        tu acceso y, cuando proceda, poner los hechos en conocimiento de las autoridades o reclamar
        los daños causados.
      </P>

      <H2>4. Servicios y presupuestos</H2>
      {LEGAL.serviciosGratuitosHasta ? (
        <P>
          Hasta {LEGAL.serviciosGratuitosHasta}, los trabajos de lanzamiento se realizan sin coste
          para el cliente y sujetos a disponibilidad. No se cobra ninguna cantidad por ellos. A
          partir de esa fecha se aplicarán las tarifas publicadas, que se confirmarán por escrito
          antes de contratar e indicarán si incluyen impuestos.
        </P>
      ) : (
        <P>
          Los precios que aparecen como «desde» son orientativos ({LEGAL.ivaPrecios}). El
          presupuesto definitivo se confirma por escrito antes de contratar.
        </P>
      )}
      <P>
        La realización de los vuelos depende de las condiciones meteorológicas, del espacio aéreo,
        de la normativa aeronáutica vigente y de las autorizaciones necesarias en cada caso.
        Dronesur puede reprogramar o rechazar un vuelo que no pueda hacerse de forma segura y
        legal.
      </P>

      <H2>5. Opiniones de clientes</H2>
      <P>
        Las opiniones que aparecen en la web se recogen de mensajes que los propios clientes
        envían al titular (por ejemplo, por WhatsApp) y se publican con su permiso. El titular las
        transcribe respetando lo que dijeron, y solo corrige erratas o acorta el texto. También se
        puede enviar una opinión mediante el formulario de la web, y se publica únicamente después
        de que el titular la revise. Las opiniones no se verifican de forma independiente.
      </P>
      {LEGAL.serviciosGratuitosHasta && (
        <P>
          Durante el periodo de lanzamiento, algunos trabajos se realizan sin coste, por lo que
          parte de las opiniones puede referirse a esos trabajos.
        </P>
      )}
      <P>
        El titular no escribe opiniones inventadas, no las encarga a terceros ni ofrece pagos a
        cambio de ellas. Puede retirar las que sean ofensivas, falsas o ilegales.
      </P>
      <P>
        El nombre y la profesión o empresa de quienes dejan una opinión se muestran únicamente
        para que se pueda leer esa opinión. Está prohibido copiarlos, recopilarlos o usarlos para
        enviar publicidad, hacer llamadas comerciales o cualquier otro fin distinto.
      </P>

      <H2>6. Propiedad intelectual e industrial</H2>
      <P>
        Los textos, fotografías, vídeos, logotipos, marca, diseño y demás contenidos de esta web son
        propiedad del titular o se usan con autorización, y están protegidos por la normativa de
        propiedad intelectual e industrial. No está permitida su reproducción, distribución o
        modificación sin autorización previa y por escrito.
      </P>

      <H2>7. Responsabilidad</H2>
      <P>
        El titular no garantiza que la web esté libre de errores ni de interrupciones, y no responde
        de los daños derivados de un uso indebido de ella. Los enlaces a sitios de terceros (por
        ejemplo, Instagram o WhatsApp) se ofrecen como comodidad, y el titular no es responsable de
        sus contenidos ni de sus políticas.
      </P>

      <H2>8. Protección de datos y cookies</H2>
      <P>
        Cómo tratamos tus datos personales está explicado en la{' '}
        <Link href="/politica-de-privacidad" className="underline hover:text-gold">
          Política de privacidad
        </Link>
        , y el uso de cookies y almacenamiento en la{' '}
        <Link href="/politica-de-cookies" className="underline hover:text-gold">
          Política de cookies
        </Link>
        .
      </P>

      <H2>9. Legislación aplicable y jurisdicción</H2>
      <P>
        Este aviso se rige por la legislación española. Si eres consumidor, podrás acudir a los
        juzgados y tribunales que te correspondan conforme a la normativa de consumo aplicable.
      </P>
          </>
        }
        en={
          <>

      <P>
        <strong>Courtesy translation.</strong> This English version is provided for convenience. If
        there is any discrepancy, the Spanish version prevails.
      </P>

      <H2>1. Identification details of the website owner</H2>
      <P>
        In compliance with Article 10 of Spanish Law 34/2002 on Information Society Services and
        Electronic Commerce (LSSI-CE), the owner of this website is:
      </P>
      <UL
        items={[
          <>Owner: {LEGAL.titular}</>,
          <>Tax ID (NIF/CIF): {LEGAL.nif}</>,
          <>Address: {LEGAL.domicilio}</>,
          <>Email: {LEGAL.email}</>,
          <>Phone: {LEGAL.telefono}</>,
          <>Website: {LEGAL.web}</>,
          <>Activity: Professional aerial photography and video services with drones</>,
          ...(LEGAL.registroMercantil ? [<>Commercial register: {LEGAL.registroMercantil}</>] : []),
          ...(LEGAL.operadorAesa ? [<>Drone operator (AESA): {LEGAL.operadorAesa}</>] : []),
        ]}
      />

      <H2>2. Purpose and acceptance</H2>
      <P>
        This notice governs access to and use of the website {LEGAL.web}. By browsing it you accept
        these terms. If you do not agree with them, please do not use the website.
      </P>

      <H2>3. Terms of use</H2>
      <P>
        You agree to use the website in accordance with the law, good faith and public order. In
        particular, it is forbidden to:
      </P>
      <UL
        items={[
          <>Carry out unlawful activities or activities that infringe the rights of third parties.</>,
          <>
            Introduce viruses, malicious code or any element that may damage, overload or interrupt
            the website or its servers.
          </>,
          <>
            Try to access restricted areas (for example, the administration panel) or bypass
            security measures, including the submission limits of the reviews form.
          </>,
          <>
            Use automated programs (bots, scrapers) to extract content from the website or to submit
            forms in bulk.
          </>,
          <>
            Publish offensive or false content or content that infringes the rights of third
            parties, impersonate another person or include other people’s personal data without
            their permission.
          </>,
          <>
            Use other people’s personal data that appears on the website (for example, the name and
            profession or company of those who leave a review) to send advertising or commercial
            communications, make sales calls, build contact lists or for any purpose other than
            reading the website.
          </>,
        ]}
      />
      <P>
        If you breach these terms, the owner may remove the content concerned, block your access
        and, where appropriate, report the facts to the authorities or claim compensation for the
        damage caused.
      </P>

      <H2>4. Services and quotes</H2>
      {LEGAL.serviciosGratuitosHasta ? (
        <P>
          Until {dateEn(LEGAL.serviciosGratuitosHasta)}, launch jobs are carried out at no cost to
          the client and subject to availability. No amount is charged for them. From that date the
          published rates will apply, which will be confirmed in writing before hiring and will
          state whether they include taxes.
        </P>
      ) : (
        <P>
          Prices shown as “from” are indicative ({ivaEn(LEGAL.ivaPrecios)}). The final quote is
          confirmed in writing before hiring.
        </P>
      )}
      <P>
        Flights depend on weather conditions, airspace, current aviation regulations and the
        authorisations required in each case. Dronesur may reschedule or decline a flight that
        cannot be carried out safely and legally.
      </P>

      <H2>5. Customer reviews</H2>
      <P>
        The reviews on the website are collected from messages that customers themselves send to the
        owner (for example, via WhatsApp) and are published with their permission. The owner
        transcribes them faithfully, only correcting typos or shortening the text. A review can also
        be submitted through the website form, and it is published only after the owner has reviewed
        it. Reviews are not independently verified.
      </P>
      {LEGAL.serviciosGratuitosHasta && (
        <P>
          During the launch period, some jobs are carried out at no cost, so some of the reviews may
          refer to those jobs.
        </P>
      )}
      <P>
        The owner does not write fake reviews, does not commission them from third parties and does
        not offer payment in exchange for them. The owner may remove those that are offensive, false
        or unlawful.
      </P>
      <P>
        The name and profession or company of those who leave a review are shown solely so that the
        review can be read. It is forbidden to copy or collect them or to use them to send
        advertising, make sales calls or for any other purpose.
      </P>

      <H2>6. Intellectual and industrial property</H2>
      <P>
        The texts, photographs, videos, logos, brand, design and other content of this website are
        owned by the owner or used with authorisation, and are protected by intellectual and
        industrial property law. Reproduction, distribution or modification without prior written
        authorisation is not permitted.
      </P>

      <H2>7. Liability</H2>
      <P>
        The owner does not guarantee that the website will be free of errors or interruptions, and
        is not liable for damage arising from misuse of it. Links to third-party sites (for example,
        Instagram or WhatsApp) are provided for convenience, and the owner is not responsible for
        their content or policies.
      </P>

      <H2>8. Data protection and cookies</H2>
      <P>
        How we process your personal data is explained in the{' '}
        <Link href="/politica-de-privacidad" className="underline hover:text-gold">
          Privacy Policy
        </Link>
        , and the use of cookies and storage in the{' '}
        <Link href="/politica-de-cookies" className="underline hover:text-gold">
          Cookie Policy
        </Link>
        .
      </P>

      <H2>9. Applicable law and jurisdiction</H2>
      <P>
        This notice is governed by Spanish law. If you are a consumer, you may go to the courts that
        correspond to you under applicable consumer law.
      </P>
          </>
        }
      />
    </LegalPage>
  )
}
