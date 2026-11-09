// Política de privacidad y Términos y condiciones de Butaca (proyecto académico).
//
// Describen lo que la aplicación hace HOY según el código. No identifican a
// una sociedad ni inventan nombres, correos o direcciones: el responsable es
// el equipo del proyecto y el canal de contacto es su repositorio público.
// Revisión interna pendiente (no se publica aquí; ver IARECURSO.md):
// - identificar a la persona o institución responsable si el proyecto pasa a
//   uso real fuera del ámbito académico, con un canal privado de contacto;
// - la edad mínima de 18 años es una política propuesta del proyecto: el
//   registro todavía acepta edades desde 5 años (ver IARECURSO.md).

import Contacto from './Contacto.jsx'

export const ACTUALIZADO = '8 de noviembre de 2026'

export const INTRO = {
  privacidad: (
    <>
      Butaca es un proyecto académico desarrollado por un equipo de estudiantes. Esta política explica qué información
      usa la aplicación, para qué y qué podés hacer con ella. Describe el funcionamiento actual de Butaca.
    </>
  ),
  terminos: (
    <>
      Butaca es un proyecto académico desarrollado por un equipo de estudiantes con fines de aprendizaje y
      demostración. Estos términos regulan el uso de la aplicación tal como funciona actualmente.
    </>
  ),
}

export const PRIVACIDAD = [
  {
    id: 'responsable',
    titulo: 'Quién es responsable',
    contenido: (
      <p>
        El responsable de Butaca y del tratamiento de la información descrita en esta política es el equipo de estudiantes
        que desarrolla el proyecto. Butaca no es un servicio comercial ni pertenece a una empresa. Para cualquier consulta
        podés contactar al equipo <Contacto />.
      </p>
    ),
  },
  {
    id: 'datos',
    titulo: 'Qué datos recopilamos',
    contenido: (
      <>
        <p>Según cómo uses Butaca, tratamos estos datos:</p>
        <ul>
          <li><strong>Datos de tu cuenta:</strong> el identificador y el correo electrónico que nos entrega Google o GitHub al iniciar sesión y, si el proveedor los comparte, tu nombre público y la dirección de tu foto de perfil.</li>
          <li><strong>Datos de registro:</strong> el nombre, el apellido y la edad que escribís en «Queremos conocerte».</li>
          <li><strong>Perfiles:</strong> el nombre, el apellido y la edad de cada perfil que crees dentro de tu cuenta.</li>
          <li><strong>Emociones guardadas:</strong> solo cuando lo autorizás, la emoción resultante del análisis, su nivel de confianza, su origen y la fecha.</li>
          <li><strong>Actividad en Butaca:</strong> favoritos, historial de recomendaciones y notificaciones.</li>
          <li><strong>Grupos:</strong> los grupos que creás o integrás, los correos que invitás y las recomendaciones que compartís.</li>
        </ul>
        <p>Butaca no recopila datos de pago ni muestra publicidad.</p>
      </>
    ),
  },
  {
    id: 'nombres',
    titulo: 'Uso de nombres, correos y perfiles',
    contenido: (
      <>
        <p>Usamos tu correo para identificar tu cuenta y para vincular las invitaciones a grupos enviadas a esa dirección.</p>
        <p>
          El nombre de tu perfil se muestra dentro de la aplicación y, cuando participás en un grupo, lo ven las demás
          personas del grupo junto con lo que compartís. Las personas de tus grupos también pueden ver el correo con el que
          ingresaste.
        </p>
        <p>
          Cada perfil de una cuenta tiene sus propios favoritos, historial, emociones y recomendaciones. La persona titular
          de la cuenta puede crear, editar y eliminar los perfiles adicionales.
        </p>
      </>
    ),
  },
  {
    id: 'edad',
    titulo: 'Edad y perfiles de menores',
    contenido: (
      <>
        <p>
          Para crear una cuenta propia en Butaca se requiere tener 18 años o más. Es la política del proyecto para el uso de
          la aplicación.
        </p>
        <p>
          La persona adulta titular de una cuenta puede crear perfiles para otras personas de su hogar, incluidos menores de
          edad, y es responsable de su uso. Pedimos la edad de cada perfil para ofrecer contenido apropiado para su etapa;
          se guarda junto con el perfil y no se comparte con otras personas.
        </p>
      </>
    ),
  },
  {
    id: 'camara',
    titulo: 'Cámara y análisis de expresiones',
    contenido: (
      <>
        <p>La cámara se usa solo cuando entrás en «Escanearme» y aceptás el permiso del navegador.</p>
        <ul>
          <li>El análisis de la expresión facial se hace <strong>en tu propio navegador</strong>. Las imágenes y los fotogramas de la cámara <strong>no se envían</strong> a los servidores de Butaca ni se guardan.</li>
          <li>Butaca <strong>no identifica a las personas</strong> ni realiza reconocimiento biométrico: no compara rostros ni crea plantillas de tu cara. Solo estima cuál de siete expresiones (por ejemplo, alegría o sorpresa) se parece más a la tuya y con qué confianza.</li>
          <li>Ese resultado es una guía para recomendar películas y series, <strong>no un diagnóstico</strong> ni una evaluación de tu estado de ánimo o de tu salud.</li>
          <li>El resultado se guarda en tu historial solo si dejás marcada la autorización de guardado en esa pantalla. Si la desmarcás, se usa una sola vez para recomendarte títulos y no se guarda.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'actividad',
    titulo: 'Favoritos, historial y recomendaciones',
    contenido: (
      <>
        <p>
          Guardamos tus favoritos y el historial de recomendaciones para mostrártelos cuando quieras consultarlos. Las
          recomendaciones se eligen relacionando la emoción analizada o seleccionada con géneros de películas y series.
        </p>
        <p>
          Tu navegador también guarda en tu dispositivo la sesión iniciada, algunas recomendaciones recientes y el perfil
          elegido mientras la pestaña está abierta. Butaca no usa cookies de publicidad ni de seguimiento.
        </p>
      </>
    ),
  },
  {
    id: 'grupos',
    titulo: 'Grupos e intercambio de recomendaciones',
    contenido: (
      <ul>
        <li>Podés invitar a otras personas escribiendo su correo. Si todavía no tienen cuenta, la invitación queda guardada y se vincula cuando ingresan con ese correo.</li>
        <li>Lo que compartís en un grupo (título, mensaje opcional, nombre del perfil que compartió y fecha) lo ven las personas del grupo; si lo enviás a una sola persona, solo lo ven vos y esa persona.</li>
        <li>Tus favoritos, tu historial y tus emociones <strong>no</strong> se comparten con los grupos: solo se comparte lo que elegís enviar.</li>
        <li>Quien crea un grupo puede quitar integrantes o eliminar el grupo, y cualquier integrante puede salir.</li>
      </ul>
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
        <p>Estos proveedores pueden procesar la información en servidores ubicados fuera de tu país.</p>
      </>
    ),
  },
  {
    id: 'seguridad',
    titulo: 'Almacenamiento y seguridad',
    contenido: (
      <>
        <p>
          La información se conserva mientras tu cuenta esté activa o hasta que solicites su eliminación. Cada petición con
          datos personales exige una sesión válida, y cada servicio verifica que el perfil consultado pertenezca a tu cuenta
          antes de entregar o guardar información. Las conexiones con la aplicación usan HTTPS.
        </p>
        <p>
          Ningún sistema es completamente seguro, por lo que no podemos garantizar que la información nunca se vea
          afectada. Si detectás un problema de seguridad, avisanos <Contacto />.
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
          Podés consultar y corregir tu información desde la aplicación: editar el nombre, el apellido y la edad de tus
          perfiles, quitar favoritos, borrar registros del historial de recomendaciones, eliminar perfiles adicionales y
          salir de grupos o eliminar los que creaste.
        </p>
        <p>
          También podés pedir acceso a tus datos, su corrección o su eliminación. Atenderemos la solicitud en la medida en
          que lo permitan las herramientas del proyecto.
        </p>
      </>
    ),
  },
  {
    id: 'eliminacion',
    titulo: 'Cómo solicitar la eliminación de tus datos',
    contenido: (
      <p>
        Hoy la aplicación no tiene una opción para eliminar la cuenta completa ni las emociones guardadas. Podés
        solicitarlo <Contacto />. Al eliminar una cuenta se borran también sus perfiles, emociones, favoritos, historial,
        grupos propios y notificaciones.
      </p>
    ),
  },
  {
    id: 'contacto',
    titulo: 'Contacto',
    contenido: (
      <p>
        Para consultas sobre esta política o sobre tus datos, contactá al equipo del proyecto <Contacto />.
      </p>
    ),
  },
  {
    id: 'cambios',
    titulo: 'Cambios en esta política',
    contenido: (
      <p>
        Si cambiamos esta política, publicaremos la nueva versión en esta página con su fecha de actualización. Si el
        cambio es importante, lo indicaremos también dentro de la aplicación.
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
        Butaca es una aplicación web que recomienda películas y series según la expresión analizada con la cámara o la
        emoción que elegís, y que permite guardar favoritos, administrar perfiles y compartir recomendaciones en grupos. Es
        un proyecto académico sin fines comerciales, desarrollado y mantenido por un equipo de estudiantes. Al usar Butaca
        aceptás estos términos.
      </p>
    ),
  },
  {
    id: 'cuentas',
    titulo: 'Registro y uso de cuentas',
    contenido: (
      <ul>
        <li>Para usar Butaca iniciás sesión con una cuenta de Google o GitHub y completás tu nombre, apellido y edad.</li>
        <li>Para crear una cuenta propia se requiere tener <strong>18 años o más</strong>.</li>
        <li>La persona titular puede crear perfiles para otras personas de su hogar, incluidos menores de edad, y es responsable de su uso.</li>
        <li>Los datos que ingreses deben ser verdaderos y mantenerse actualizados.</li>
        <li>Sos responsable de la actividad que ocurra en tu cuenta y en sus perfiles.</li>
      </ul>
    ),
  },
  {
    id: 'responsabilidad',
    titulo: 'Responsabilidad de las personas usuarias',
    contenido: (
      <p>
        Te comprometés a usar Butaca de buena fe, a respetar a las demás personas y a no usarla para fines ilegales o que
        afecten a terceros. El análisis de expresiones es una herramienta orientativa para recomendar contenido: no es un
        diagnóstico ni una evaluación psicológica o médica, y no debe usarse para tomar decisiones sobre la salud.
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
        completa o exacta ni la disponibilidad de los títulos en plataformas de streaming. Las recomendaciones son
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
          <li>Usar Butaca con fines comerciales o revender el servicio.</li>
          <li>Usar la cámara o el análisis de expresiones con otra persona sin su conocimiento y consentimiento.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'propiedad',
    titulo: 'Propiedad intelectual',
    contenido: (
      <p>
        El nombre, el logo, el diseño y el código de Butaca fueron creados por el equipo del proyecto como parte de su
        trabajo académico. Las marcas, los títulos y las imágenes de películas y series pertenecen a sus respectivos
        propietarios. Los mensajes que escribís siguen siendo tuyos; nos permitís mostrarlos a las personas con las que los
        compartís.
      </p>
    ),
  },
  {
    id: 'disponibilidad',
    titulo: 'Disponibilidad y cambios del servicio',
    contenido: (
      <p>
        Por ser un proyecto académico, Butaca puede tener interrupciones o demoras; por ejemplo, el primer ingreso después de
        un tiempo sin uso puede tardar mientras se activan los servicios. El equipo puede modificar, suspender o
        discontinuar funciones, o la aplicación completa, por ejemplo al finalizar el proyecto. Si cambiamos estos términos,
        publicaremos la nueva versión en esta página con su fecha.
      </p>
    ),
  },
  {
    id: 'limitacion',
    titulo: 'Limitación de responsabilidad',
    contenido: (
      <p>
        Butaca se ofrece «tal como está», sin garantías de funcionamiento continuo ni de resultados. En la medida permitida
        por la normativa aplicable, el equipo del proyecto no es responsable por daños derivados del uso de la aplicación,
        de la información de terceros o de la imposibilidad temporal de usarla. Nada de lo anterior limita los derechos que
        la ley te reconoce.
      </p>
    ),
  },
  {
    id: 'cuenta',
    titulo: 'Suspensión y baja',
    contenido: (
      <p>
        El equipo puede suspender el acceso de quien incumpla estos términos. Podés dejar de usar Butaca cuando quieras y
        solicitar la eliminación de tu cuenta como se explica en la Política de privacidad.
      </p>
    ),
  },
  {
    id: 'general',
    titulo: 'Contacto y disposiciones generales',
    contenido: (
      <>
        <p>Para consultas sobre estos términos podés contactar al equipo del proyecto <Contacto />.</p>
        <p>
          Estos términos se interpretan conforme a la normativa aplicable. Si alguna cláusula no fuera válida, el resto
          seguirá vigente.
        </p>
      </>
    ),
  },
]
