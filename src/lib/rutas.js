// Navegación de Butaca con rutas reales (/galeria, /grupos/<id>, …) sobre la
// History API del navegador. Reemplaza la navegación por hash de pf20: las
// direcciones antiguas (/#grupos, /#perfiles…) se convierten al cargar la
// página para no romper enlaces compartidos.
//
// En producción (Render, sitio estático) cada ruta tiene su propio index.html
// generado en el build (ver vite.config.js), así que entrar directo o recargar
// /grupos no da 404.

const EMOCIONES = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Pestañas del dashboard y la ruta que las abre.
export const SECCIONES_DASHBOARD = ['emociones', 'recomendaciones', 'historial', 'favoritos']

// Primer segmento de cada ruta de la aplicación (también los usa el build).
export const RUTAS_APLICACION = [
  'perfiles', 'galeria', 'rostro', 'grupos', 'dashboard', 'historial', 'favoritos',
  'recomendaciones', 'privacidad', 'terminos',
]
// Pantallas que se ven sin iniciar sesión.
export const RUTAS_PUBLICAS = ['privacidad', 'terminos']

// Avisa a la aplicación que cambió la ruta (pushState no dispara eventos).
export const EVENTO_NAVEGACION = 'butaca:navegacion'

/**
 * Traduce una ruta ('/grupos/<id>') —o un hash antiguo ('#grupos/<id>')— a
 * { pantalla, seccion?, emocion?, animoId?, grupoId? }.
 * Cualquier ruta desconocida es 'inicio'.
 */
export function leerRuta(ruta = '/') {
  const limpia = String(ruta).replace(/^#\/?/, '').split(/[?#]/)[0]
  const partes = limpia.split('/').filter(Boolean)
  const [base, clave, valor] = partes

  switch (base) {
    case 'perfiles':
    case 'galeria':
    case 'rostro':
    case 'privacidad':
    case 'terminos':
      return { pantalla: base }
    case 'grupos':
      // /grupos o /grupos/<uuid> (grupo abierto).
      return UUID.test(clave ?? '') ? { pantalla: 'grupos', grupoId: clave.toLowerCase() } : { pantalla: 'grupos' }
    case 'dashboard':
      return { pantalla: 'dashboard', seccion: 'emociones' }
    case 'historial':
    case 'favoritos':
      return { pantalla: 'dashboard', seccion: base }
    case 'recomendaciones': {
      const resultado = { pantalla: 'dashboard', seccion: 'recomendaciones' }
      if (clave === 'emocion' && EMOCIONES.includes(valor)) return { ...resultado, emocion: valor }
      if (clave === 'animo' && UUID.test(valor ?? '')) return { ...resultado, animoId: valor.toLowerCase() }
      return resultado
    }
    default:
      return { pantalla: 'inicio' }
  }
}

/** Ruta de cada sección del dashboard. */
export function rutaDeSeccion(seccion) {
  return seccion === 'emociones' ? '/dashboard' : `/${seccion}`
}

/** Ruta para ver recomendaciones de una emoción (sin guardar) o de un ánimo guardado. */
export function rutaDeRecomendaciones({ emocion, animoId } = {}) {
  if (animoId && UUID.test(animoId)) return `/recomendaciones/animo/${animoId}`
  if (EMOCIONES.includes(emocion)) return `/recomendaciones/emocion/${emocion}`
  return '/recomendaciones'
}

/** Ruta de la pantalla de grupos, con el grupo abierto si se indica. */
export function rutaDeGrupo(grupoId) {
  return grupoId && UUID.test(grupoId) ? `/grupos/${grupoId}` : '/grupos'
}

/** ¿La ruta pertenece a Butaca? (para interceptar enlaces sin recargar). */
export function esRutaInterna(ruta) {
  if (typeof ruta !== 'string' || !ruta.startsWith('/')) return false
  const base = ruta.split(/[?#]/)[0].split('/').filter(Boolean)[0]
  return base === undefined || RUTAS_APLICACION.includes(base)
}

/**
 * Enlace antiguo con hash → ruta nueva. Solo convierte rutas de Butaca: un
 * hash de OAuth (#access_token=…) o cualquier otro se deja intacto (null).
 */
export function rutaDesdeHashLegado(hash) {
  const contenido = String(hash ?? '').replace(/^#\/?/, '')
  const base = contenido.split('/')[0]
  if (!RUTAS_APLICACION.includes(base)) return null
  return `/${contenido.split(/[?#]/)[0].replace(/\/+$/, '')}`
}

function avisar() {
  window.dispatchEvent(new Event(EVENTO_NAVEGACION))
}

/** Navega a una ruta interna dejando una entrada en el historial (Atrás funciona). */
export function navegar(ruta) {
  if (`${window.location.pathname}${window.location.search}` === ruta) return
  window.history.pushState(null, '', ruta)
  avisar()
}

/** Cambia la ruta sin dejar una entrada extra en el historial (redirecciones). */
export function reemplazarRuta(ruta) {
  window.history.replaceState(null, '', ruta)
  avisar()
}

/**
 * Se llama una vez al iniciar la app:
 * - convierte /#grupos (enlaces viejos) en /grupos sin recargar;
 * - Atrás/Adelante del navegador (popstate) avisan como cualquier navegación;
 * - los <a href="/ruta"> internos navegan sin recargar la página (salvo
 *   Ctrl/Cmd+clic, clic central o target, que se respetan).
 */
export function instalarNavegacion() {
  const legado = rutaDesdeHashLegado(window.location.hash)
  if (legado) window.history.replaceState(null, '', legado)

  window.addEventListener('popstate', avisar)
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const enlace = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (!enlace || (enlace.target && enlace.target !== '_self') || enlace.hasAttribute('download')) return
    const url = new URL(enlace.href, window.location.href)
    if (url.origin !== window.location.origin || !esRutaInterna(url.pathname)) return
    // Ancla dentro de la misma página (índice de /privacidad): salto normal del navegador.
    if (url.hash && url.pathname === window.location.pathname) return
    event.preventDefault()
    navegar(`${url.pathname}${url.search}`)
  })
}
