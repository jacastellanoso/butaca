// Despertar microservicios dormidos de Render desde el navegador.
//
// En el plan gratuito, un servicio dormido NO despierta con las peticiones que
// le hace el gateway desde dentro de Render: el gateway recibe un 502 inmediato
// (medido en producción: 9 intentos en 73 s, todos 502). Sí despierta con una
// petición externa. Por eso el gateway agrega X-Butaca-Despertar con la URL
// pública de /health del servicio, y el navegador la visita (no-cors: no lee
// la respuesta, solo provoca el arranque). Los reintentos existentes completan
// la carga cuando el servicio ya respondió.

const ENCABEZADO = 'x-butaca-despertar'
const INTERVALO_MS = 20_000
const ultimos = new Map()

/** Solo URLs https de Render que terminan en /health (nunca una URL arbitraria). */
export function urlDespertarValida(valor) {
  try {
    const url = new URL(valor)
    return url.protocol === 'https:' && url.hostname.endsWith('.onrender.com') && url.pathname === '/health' && !url.search
      ? url.href
      : null
  } catch {
    return null
  }
}

/** Pide /health del servicio una vez cada 20 s como máximo. Devuelve si se pidió. */
export function despertarServicio(valor, { ahora = Date.now(), pedir = globalThis.fetch } = {}) {
  const url = urlDespertarValida(valor)
  if (!url || typeof pedir !== 'function') return false
  if (ahora - (ultimos.get(url) ?? -Infinity) < INTERVALO_MS) return false
  ultimos.set(url, ahora)
  Promise.resolve()
    .then(() => pedir(url, { mode: 'no-cors', cache: 'no-store', credentials: 'omit' }))
    .catch(() => {})
  return true
}

/** Si la respuesta del gateway indica un servicio dormido, lo despierta. */
export function despertarSiHaceFalta(respuesta, opciones) {
  const valor = respuesta?.headers?.get?.(ENCABEZADO)
  return valor ? despertarServicio(valor, opciones) : false
}

/** Solo para pruebas. */
export function olvidarDespertares() {
  ultimos.clear()
}
