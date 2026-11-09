// Perfil activo de la sesión, compartido por todas las llamadas al gateway.
//
// solicitarApi() lo envía en el encabezado X-Butaca-Perfil y cada
// microservicio verifica en el servidor que el perfil pertenezca a la cuenta
// del token antes de leer o guardar ánimos, favoritos, historial o
// notificaciones. Aquí solo se recuerda cuál eligió la persona.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

let perfilActivoId = null

/** Fija el perfil para las próximas peticiones (null: perfil principal por defecto). */
export function fijarPerfilActivo(id) {
  perfilActivoId = typeof id === 'string' && UUID.test(id) ? id : null
}

export function perfilActivoActual() {
  return perfilActivoId
}
