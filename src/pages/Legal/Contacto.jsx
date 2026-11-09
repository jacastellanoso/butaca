// Canal de contacto del proyecto: su repositorio público (no se inventan correos).
const REPOSITORIO = 'https://github.com/jacastellanoso/butaca'

function Contacto() {
  return (
  <>
    a través del <a href={REPOSITORIO} target="_blank" rel="noreferrer">repositorio público del proyecto en GitHub</a> (sección «Issues»).
    No publiques datos personales en ese mensaje: indicá solo el motivo y el equipo coordinará un canal privado para
    verificar tu identidad y atender la solicitud
  </>
  )
}

export default Contacto
