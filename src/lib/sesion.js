// Lógica pura de sesión. Recibe el cliente de Supabase por parámetro para
// poder probarla sin red; la instancia real sigue viviendo en supabase.js.

// Estados de error de Supabase Auth que significan sesión inválida o revocada.
const ESTADOS_SESION_INVALIDA = [400, 401, 403, 404, 422]

/**
 * Valida la sesión con el servidor de Supabase Auth (getUser), no solo con lo
 * guardado en localStorage. Devuelve:
 * - { estado: 'autenticado', usuario }
 * - { estado: 'anonimo' } si no hay sesión o el servidor la rechaza
 * - { estado: 'error' } si Supabase no respondió (la sesión puede seguir siendo válida)
 * - { estado: 'sin-configuracion' } si faltan las variables VITE_SUPABASE_*
 */
export async function validarSesion(cliente) {
  if (!cliente) return { estado: 'sin-configuracion' }

  try {
    const { data: sesion, error: errorSesion } = await cliente.auth.getSession()
    if (errorSesion) throw errorSesion
    if (!sesion?.session?.access_token) return { estado: 'anonimo' }

    const { data, error } = await cliente.auth.getUser()
    if (error) {
      if (ESTADOS_SESION_INVALIDA.includes(error.status)) {
        // Token revocado o expirado sin posibilidad de renovarse: se descarta localmente.
        await cliente.auth.signOut({ scope: 'local' }).catch(() => {})
        return { estado: 'anonimo' }
      }
      // Un fallo transitorio no debe expulsar a quien conserva una sesión local.
      // Las API siguen verificando el JWT antes de entregar datos protegidos.
      const usuarioLocal = sesion.session.user
      return usuarioLocal?.id
        ? { estado: 'autenticado', usuario: usuarioLocal, verificacionPendiente: true }
        : { estado: 'error' }
    }
    if (!data?.user?.id) return { estado: 'anonimo' }
    return { estado: 'autenticado', usuario: data.user }
  } catch {
    return { estado: 'error' }
  }
}
