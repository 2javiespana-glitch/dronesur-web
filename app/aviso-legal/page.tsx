import Link from 'next/link'
import type { Metadata } from 'next'
import { LegalPage, H2, P, UL } from '@/components/legal-page'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Aviso legal | Dronesur',
  description: 'Aviso legal e información del titular de la web de Dronesur.',
}

export default function AvisoLegalPage() {
  return (
    <LegalPage title="Aviso legal">
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
    </LegalPage>
  )
}
