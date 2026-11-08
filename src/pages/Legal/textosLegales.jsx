// Borradores de la Política de privacidad y de los Términos y condiciones.
//
// Describen lo que la aplicación hace HOY según el código (pf25). No son
// textos aprobados: todo lo marcado con <Pendiente> debe completarse o
// confirmarse en la revisión legal antes de publicarlos como definitivos.
// No se inventan razón social, correos, plazos de conservación ni
// certificaciones de seguridad.

import Pendiente from './Pendiente.jsx'

export const ACTUALIZADO = '8 de noviembre de 2026'

export const PRIVACIDAD = [
  {
    id: 'responsable',
    titulo: 'Quién es responsable',
    contenido: (
      <>
        <p>
          Butaca es una aplicación web para descubrir películas y series según cómo te sentís. El responsable del
          tratamiento de tus datos es <Pendiente>nombre o razón social del responsable y país</Pendiente>.
        </p>
      </>
    ),
  },
  {
    id: 'datos',
    titulo: 'Qué datos recopilamos',
    contenido: (
      <>
        <p>Según cómo uses Butaca, tratamos estos datos:</p>
        <ul>
          <li><strong>Datos de tu cuenta:</strong> el identificador y el correo electrónico que nos entrega Google o GitHub al iniciar sesión, y, si el proveedor los comparte, tu nombre público y la dirección de tu foto de perfil.</li>
          <li><strong>Datos de registro:</strong> el nombre, el apellido y la edad que escribís en «Queremos conocerte».</li>
          <li><strong>Perfiles:</strong> el nombre, el apellido y la edad de cada perfil que crees dentro de tu cuenta.</li>
          <li><strong>Emociones guardadas:</strong> solo cuando lo autorizás, la emoción detectada, el nivel de confianza del análisis, su origen y la fecha.</li>
          <li><strong>Actividad en Butaca:</strong> favoritos, historial de recomendaciones y las notificaciones que recibís.</li>
          <li><strong>Grupos:</strong> los grupos que creás o integrás, los correos que invitás y las recomendaciones que compartís.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'nombres',
    titulo: 'Uso de nombres, correos y perfiles',
    contenido: (
      <>
        <p>Usamos tu correo para identificar tu cuenta y para vincular las invitaciones a grupos que te envíen a esa dirección.</p>
        <p>
          El nombre de tu perfil se muestra dentro de la aplicación y, cuando participás en un grupo, lo ven las demás
          personas del grupo junto con lo que compartís. Las personas de tus grupos también pueden ver el correo con el que
          ingresaste.
        </p>
        <p>
          Cada perfil de una cuenta tiene sus propios favoritos, historial, emociones y recomendaciones. Quien usa la
          cuenta principal puede crear, editar y eliminar los perfiles adicionales.
        </p>
      </>
    ),
  },
  {
    id: 'edad',
    titulo: 'Tratamiento de la edad',
    contenido: (
      <>
        <p>
          Pedimos la edad (entre 5 y 120 años) de la cuenta y de cada perfil para ofrecer contenido apropiado para cada
          etapa. Se guarda junto con el perfil y no se comparte con otras personas.
        </p>
        <p>
          Butaca admite perfiles de menores dentro de la cuenta de una persona adulta. <Pendiente>definir la edad mínima
          para crear una cuenta propia y el mecanismo de consentimiento de madres, padres o tutores según la normativa
          aplicable</Pendiente>.
        </p>
      </>
    ),
  },
  {
    id: 'camara',
    titulo: 'Cámara y reconocimiento de emociones',
    contenido: (
      <>
        <p>La cámara se usa solo cuando entrás en «Escanearme» y aceptás el permiso del navegador.</p>
        <ul>
          <li>El análisis de la expresión facial se hace <strong>en tu propio navegador</strong>. Las imágenes y los fotogramas de la cámara <strong>no se envían</strong> a nuestros servidores ni se guardan.</li>
          <li>El resultado es una de siete emociones (por ejemplo, alegría o tristeza) con un nivel de confianza. No identificamos personas ni creamos plantillas biométricas de tu rostro.</li>
          <li>Ese resultado se guarda en tu historial solo si dejás marcada la autorización de guardado en esa pantalla. Si la desmarcás, el resultado se usa una sola vez para recomendarte títulos y no se guarda.</li>
        </ul>
        <p>
          <Pendiente>la casilla de autorización aparece marcada de forma predeterminada; confirmar si debe empezar
          desmarcada para cumplir con el consentimiento expreso requerido</Pendiente>.
        </p>
      </>
    ),
  },
  {
    id: 'actividad',
    titulo: 'Favoritos, historial y recomendaciones',
    contenido: (
      <>
        <p>
          Guardamos tus favoritos y el historial de recomendaciones para mostrártelos y mejorar lo que te sugerimos. Las
          recomendaciones se generan a partir de la emoción elegida o detectada y del catálogo de películas y series.
        </p>
        <p>
          Para mostrarte recomendaciones recientes, el navegador también guarda una copia local en tu dispositivo. El
          perfil que elegís se recuerda solo mientras la pestaña está abierta.
        </p>
      </>
    ),
  },
  {
    id: 'grupos',
    titulo: 'Grupos e intercambio de recomendaciones',
    contenido: (
      <>
        <ul>
          <li>Podés invitar a otras personas escribiendo su correo. Si todavía no tienen cuenta, la invitación queda guardada y se vincula cuando ingresan con ese correo.</li>
          <li>Lo que compartís en un grupo (título, mensaje opcional, nombre del perfil que compartió y fecha) lo ven las personas del grupo; si lo enviás a una sola persona, solo lo ven vos y esa persona.</li>
          <li>Tus favoritos, tu historial y tus emociones <strong>no</strong> se comparten con los grupos: solo se comparte lo que elegís enviar.</li>
          <li>Quien crea un grupo puede quitar integrantes o eliminar el grupo, y cualquier integrante puede salir.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'terceros',
    titulo: 'Google, GitHub y otros servicios',
    contenido: (
      <>
        <p>Butaca funciona con estos proveedores:</p>
        <ul>
          <li><strong>Google y GitHub:</strong> para iniciar sesión. Aplican sus propias políticas de privacidad.</li>
          <li><strong>Supabase:</strong> gestiona el inicio de sesión y aloja la base de datos.</li>
          <li><strong>Render:</strong> aloja la aplicación y sus servicios.</li>
          <li><strong>The Movie Database (TMDB):</strong> provee la información y las imágenes de películas y series. Butaca no le envía tus datos personales.</li>
        </ul>
        <p><Pendiente>confirmar ubicación de los servidores, transferencias internacionales y acuerdos de tratamiento con cada proveedor</Pendiente>.</p>
      </>
    ),
  },
  {
    id: 'seguridad',
    titulo: 'Almacenamiento y seguridad',
    contenido: (
      <>
        <p>
          Cada petición con datos personales exige una sesión válida, y cada servicio verifica que el perfil consultado
          pertenezca a tu cuenta antes de entregar o guardar información. Las conexiones con la aplicación usan HTTPS.
        </p>
        <p>
          Ningún sistema es completamente seguro: no podemos garantizar que la información nunca se vea afectada.
          <Pendiente>plazo de conservación de los datos y procedimiento ante incidentes de seguridad</Pendiente>.
        </p>
      </>
    ),
  },
  {
    id: 'derechos',
    titulo: 'Tus derechos',
    contenido: (
      <>
        <p>
          Podés acceder a tu información y corregirla desde la aplicación: editar tu nombre, apellido y edad en tus
          perfiles, quitar favoritos, borrar registros del historial de recomendaciones, eliminar perfiles adicionales y
          salir de grupos o eliminar los que creaste.
        </p>
        <p>
          Según la normativa aplicable, también podés tener derecho a solicitar acceso, rectificación, oposición,
          portabilidad o eliminación de tus datos. <Pendiente>normativa aplicable y plazos de respuesta</Pendiente>.
        </p>
      </>
    ),
  },
  {
    id: 'eliminacion',
    titulo: 'Cómo solicitar la eliminación de tus datos',
    contenido: (
      <>
        <p>
          Hoy la aplicación no tiene una opción para eliminar la cuenta completa ni las emociones guardadas. Para
          solicitarlo, escribinos al contacto de privacidad indicando el correo con el que ingresás. Al eliminar una cuenta
          se borran también sus perfiles, emociones, favoritos, historial, grupos propios y notificaciones.
        </p>
        <p><Pendiente>canal oficial de solicitud y plazo de atención</Pendiente>.</p>
      </>
    ),
  },
  {
    id: 'contacto',
    titulo: 'Contacto de privacidad',
    contenido: (
      <p>
        Para consultas sobre esta política o sobre tus datos: <Pendiente>correo o formulario oficial de privacidad</Pendiente>.
      </p>
    ),
  },
  {
    id: 'cambios',
    titulo: 'Cambios en esta política',
    contenido: (
      <p>
        Si cambiamos esta política, publicaremos la nueva versión en esta página con su fecha de actualización.
        <Pendiente>definir cómo se avisará de cambios importantes</Pendiente>.
      </p>
    ),
  },
]

export const TERMINOS = [
  {
    id: 'servicio',
    titulo: 'Qué es Butaca',
    contenido: (
      <p>
        Butaca es una aplicación web que recomienda películas y series según la emoción que elegís o que detecta el
        análisis de tu expresión facial, y que permite guardar favoritos, administrar perfiles y compartir
        recomendaciones en grupos. Al usar Butaca aceptás estos términos. El servicio es prestado por
        <Pendiente>nombre o razón social del titular</Pendiente>.
      </p>
    ),
  },
  {
    id: 'cuentas',
    titulo: 'Registro y uso de cuentas',
    contenido: (
      <ul>
        <li>Para usar Butaca iniciás sesión con una cuenta de Google o GitHub y completás tu nombre, apellido y edad.</li>
        <li>Los datos que ingreses deben ser verdaderos y mantenerse actualizados.</li>
        <li>Sos responsable de la actividad que ocurra en tu cuenta y en los perfiles que crees dentro de ella, incluidos los perfiles de menores a tu cargo.</li>
        <li><Pendiente>edad mínima para crear una cuenta propia y reglas para perfiles de menores</Pendiente>.</li>
      </ul>
    ),
  },
  {
    id: 'responsabilidad',
    titulo: 'Responsabilidad de las personas usuarias',
    contenido: (
      <p>
        Te comprometés a usar Butaca de buena fe, a respetar a las demás personas y a no usar la aplicación para fines
        ilegales o que afecten a terceros. El análisis de emociones es una herramienta orientativa para recomendar
        contenido: no es un diagnóstico ni una evaluación psicológica o médica.
      </p>
    ),
  },
  {
    id: 'grupos',
    titulo: 'Grupos e invitaciones',
    contenido: (
      <ul>
        <li>Invitá solo a personas que conozcas y que estén de acuerdo en recibir la invitación.</li>
        <li>Los mensajes que acompañan las recomendaciones deben ser respetuosos: no se permite contenido ofensivo, discriminatorio, engañoso ni publicidad no solicitada.</li>
        <li>No compartas datos personales de terceros en los mensajes.</li>
        <li>Quien crea un grupo puede quitar integrantes o eliminarlo.</li>
      </ul>
    ),
  },
  {
    id: 'terceros',
    titulo: 'Recomendaciones y contenido de terceros',
    contenido: (
      <p>
        La información, las sinopsis y las imágenes de películas y series provienen de The Movie Database (TMDB). Butaca
        utiliza la API de TMDB, pero no está respaldada ni certificada por TMDB. No garantizamos que esa información sea
        completa o exacta, ni la disponibilidad de los títulos en plataformas de streaming. Las recomendaciones son
        sugerencias y no implican ninguna obligación de compra o suscripción.
      </p>
    ),
  },
  {
    id: 'restricciones',
    titulo: 'Restricciones de uso',
    contenido: (
      <>
        <p>No está permitido:</p>
        <ul>
          <li>Acceder o intentar acceder a cuentas, perfiles o datos de otras personas.</li>
          <li>Eludir las medidas de seguridad, sobrecargar los servicios o automatizar su uso de forma abusiva.</li>
          <li>Copiar, revender o explotar comercialmente el servicio sin autorización.</li>
          <li>Usar la cámara o el análisis de emociones con otra persona sin su conocimiento y consentimiento.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'propiedad',
    titulo: 'Propiedad intelectual',
    contenido: (
      <p>
        El nombre, el logo, el diseño y el código de Butaca pertenecen a sus titulares <Pendiente>titularidad y licencia
        del proyecto</Pendiente>. Las marcas, los títulos y las imágenes de películas y series pertenecen a sus
        respectivos propietarios. Los mensajes que escribís siguen siendo tuyos; nos permitís mostrarlos a las personas
        con las que los compartís.
      </p>
    ),
  },
  {
    id: 'disponibilidad',
    titulo: 'Disponibilidad y cambios del servicio',
    contenido: (
      <p>
        Butaca puede tener interrupciones o demoras; por ejemplo, el primer ingreso después de un tiempo sin uso puede
        tardar mientras se activan los servicios. Podemos modificar, suspender o discontinuar funciones. Si cambiamos
        estos términos, publicaremos la nueva versión en esta página con su fecha.
      </p>
    ),
  },
  {
    id: 'limitacion',
    titulo: 'Limitación de responsabilidad',
    contenido: (
      <p>
        Butaca se ofrece «tal como está». En la medida permitida por la ley, no somos responsables por daños indirectos
        derivados del uso del servicio, de la información de terceros o de la imposibilidad temporal de usarlo. Nada de
        esto limita los derechos que la ley te reconoce como persona consumidora. <Pendiente>revisión de esta cláusula según
        la jurisdicción aplicable</Pendiente>.
      </p>
    ),
  },
  {
    id: 'cuenta',
    titulo: 'Suspensión y baja',
    contenido: (
      <p>
        Podemos suspender el acceso de quien incumpla estos términos. Podés dejar de usar Butaca cuando quieras y
        solicitar la eliminación de tu cuenta como se explica en la Política de privacidad.
      </p>
    ),
  },
  {
    id: 'general',
    titulo: 'Contacto y disposiciones generales',
    contenido: (
      <>
        <p>Consultas sobre estos términos: <Pendiente>correo o canal oficial de contacto</Pendiente>.</p>
        <p>
          Estos términos se rigen por las leyes de <Pendiente>país o jurisdicción</Pendiente>. Si alguna cláusula no fuera
          válida, el resto seguirá vigente.
        </p>
      </>
    ),
  },
]
