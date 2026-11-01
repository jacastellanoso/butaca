import { solicitarApi } from '../../../lib/api.js'

// emotions-service exige que el usuario exista en la tabla Usuario
// (si no, responde 409). auth-service lo crea o actualiza de forma idempotente,
// así que se sincroniza una vez por sesión antes del primer guardado.
let usuarioSincronizado = false

async function sincronizarUsuario() {
  if (usuarioSincronizado) return
  await solicitarApi('/api/usuarios', { method: 'POST' })
  usuarioSincronizado = true
}

/**
 * Guarda el resultado de face-api.js en el historial emocional del usuario.
 * Solo se envían la emoción y la confianza: nunca imágenes ni fotogramas.
 * El usuario sale del token en el servidor, no se manda ningún id.
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