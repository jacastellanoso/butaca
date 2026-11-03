// Navegación por hash de toda la aplicación (pf20_RecomDashboard).
// Se mantiene el hash porque el retorno de OAuth y las pantallas previas
// (#rostro, #galeria) ya lo usaban, y no requiere configurar el servidor.

const EMOCIONES = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Pestañas del dashboard y la ruta que las abre.
export const SECCIONES_DASHBOARD = ['emociones', 'recomendaciones', 'historial', 'favoritos']

/**
 * Traduce un hash a { pantalla, seccion?, emocion?, animoId? }.
 * Cualquier hash desconocido (incluido el retorno de OAuth) es 'inicio'.
 */
export function leerRuta(hash = '') {
  const partes = String(hash).replace(/^#\/?/, '').split('/').filter(Boolean)
  const [base, clave, valor] = partes

  switch (base) {
    case 'perfiles':
    case 'galeria':
    case 'rostro':
      return { pantalla: base }
    case 'dashboard':
      return { pantalla: 'dashboard', seccion: 'emociones' }
    case 'historial':
    case 'favoritos':
      return { pantalla: 'dashboard', seccion: base }
    case 'recomendaciones': {
      const ruta = { pantalla: 'dashboard', seccion: 'recomendaciones' }
      if (clave === 'emocion' && EMOCIONES.includes(valor)) return { ...ruta, emocion: valor }
      if (clave === 'animo' && UUID.test(valor ?? '')) return { ...ruta, animoId: valor.toLowerCase() }
      return ruta
    }
    default:
      return { pantalla: 'inicio' }
  }
}

/** Hash de cada sección del dashboard. */
export function hashDeSeccion(seccion) {
  return seccion === 'emociones' ? '#dashboard' : `#${seccion}`
}

/** Hash para ver recomendaciones de una emoción (sin guardar) o de un ánimo guardado. */
export function hashDeRecomendaciones({ emocion, animoId } = {}) {
  if (animoId && UUID.test(animoId)) return `#recomendaciones/animo/${animoId}`
  if (EMOCIONES.includes(emocion)) return `#recomendaciones/emocion/${emocion}`
  return '#recomendaciones'
}

/** Cambia el hash sin dejar una entrada extra en el historial del navegador. */
export function reemplazarHash(hash) {
  const url = `${window.location.pathname}${window.location.search}${hash}`
  window.history.replaceState(null, '', url)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
