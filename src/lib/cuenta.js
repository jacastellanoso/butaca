// Preparación de la cuenta después de validar la sesión de Supabase.
//
// POST /api/usuarios (auth-service) crea o recupera el usuario de forma
// idempotente. En Render gratuito el gateway y auth-service se duermen tras
// unos minutos sin uso y tardan en despertar: mientras tanto responden 502,
// 503 o 504, o la conexión falla. Antes se reintentaba solo ~4 segundos y la
// persona quedaba en "no pudimos preparar tu cuenta" aunque su cuenta
// existiera. Aquí se reintenta con espera creciente hasta ~90 segundos.
//
// Lógica pura: recibe sus dependencias para probarla sin red ni temporizadores.

// Errores que se resuelven solos esperando: servicio dormido o sobrecargado.
const ESTADOS_TRANSITORIOS = new Set([408, 425, 429, 500, 502, 503, 504])
const CODIGOS_TRANSITORIOS = new Set(['sin-conexion', 'servicio-no-disponible', 'respuesta-invalida', 'error-servidor'])

export const ESPERAS_REINTENTO_MS = [0, 1500, 3000, 5000, 8000, 10000, 12000, 15000, 15000, 15000]

export function esErrorTransitorio(error) {
  if (!error) return false
  if (ESTADOS_TRANSITORIOS.has(error.status)) return true
  return error.status === undefined && CODIGOS_TRANSITORIOS.has(error.codigo)
}

export function esSesionRechazada(error) {
  return error?.status === 401 || error?.codigo === 'sin-sesion'
}

/**
 * Sincroniza la cuenta reintentando los errores transitorios.
 * - sincronizar(): POST /api/usuarios.
 * - renovarToken(): pide a Supabase un token nuevo; se usa una sola vez si el
 *   servidor responde 401 (token vencido justo al volver a ingresar).
 * - alEsperar(intento, total): avisa a la interfaz que se está reintentando.
 * Lanza el último error si se agotan los intentos o si no es transitorio.
 */
export async function prepararCuenta({
  sincronizar,
  renovarToken = async () => false,
  esperar,
  alEsperar = () => {},
  esperas = ESPERAS_REINTENTO_MS,
}) {
  let ultimoError
  let tokenRenovado = false

  for (let intento = 0; intento < esperas.length; intento++) {
    if (esperas[intento]) {
      alEsperar(intento, esperas.length)
      await esperar(esperas[intento])
    }
    try {
      return await sincronizar()
    } catch (error) {
      ultimoError = error
      if (esSesionRechazada(error) && !tokenRenovado) {
        tokenRenovado = true
        if (await renovarToken().catch(() => false)) {
          intento -= 1 // el reintento con token nuevo no consume una espera
          continue
        }
      }
      if (!esErrorTransitorio(error)) throw error
    }
  }
  throw ultimoError
}
