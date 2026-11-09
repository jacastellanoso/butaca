import { solicitarApi } from '../../../lib/api.js'
import { sincronizarUsuario } from '../../../services/usuarios.js'

/**
 * Guarda el resultado de face-api.js en el historial emocional del usuario.
 * Solo se envían la emoción y la confianza: nunca imágenes ni fotogramas.
 * El usuario sale del token en el servidor, no se manda ningún id.
 * Antes se asegura (una vez por sesión) que exista en la tabla Usuario.
 */
export async function guardarAnimo({ emocion, confianza }) {
  await sincronizarUsuario()

  return solicitarApi('/api/animos', {
    method: 'POST',
    body: {
      emocion,
      confianza,
      origen: 'deteccion',
      consentimientoHistorial: true,
    },
  })
}
