import { solicitarApi } from '../lib/api.js'

// emotions-service y library-service exigen que el usuario exista en la tabla
// Usuario (si no, responden 409). auth-service lo crea o actualiza de forma
// idempotente con POST /api/usuarios, así que basta una vez por sesión.
let sincronizacion = null

export function sincronizarUsuario() {
  sincronizacion ??= solicitarApi('/api/usuarios', { method: 'POST' }).catch((error) => {
    // Si falla se permite reintentar en la próxima operación.
    sincronizacion = null
    throw error
  })
  return sincronizacion
}

/** Al cerrar sesión la próxima cuenta debe volver a sincronizarse. */
export function olvidarSincronizacion() {
  sincronizacion = null
}
