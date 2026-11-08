import { despertarSiHaceFalta } from '../../../lib/despertar.js'
import { contenidosDemo } from '../data/contenidosDemo.js'

const API_GATEWAY_URL = (
  import.meta.env?.VITE_API_GATEWAY_URL ?? 'http://localhost:3000'
).replace(/\/$/, '')

function construirUrlCatalogo({ tipo, categoria, busqueda, emocion, pagina } = {}) {
  const params = new URLSearchParams()

  if (tipo && tipo !== 'all') params.set('tipo', tipo)
  if (categoria && categoria !== 'Todos') params.set('categoria', categoria)
  if (emocion) params.set('emocion', emocion)
  if (busqueda && busqueda.trim()) params.set('busqueda', busqueda.trim())
  if (pagina && Number(pagina) > 1) params.set('pagina', String(pagina))

  const queryString = params.toString()
  return `${API_GATEWAY_URL}/api/catalogo${queryString ? `?${queryString}` : ''}`
}

/**
 * Punto único de acceso al catálogo desde la galería.
 * Consulta siempre al API Gateway (`/api/catalogo`) y devuelve el arreglo de contenidos.
 */
export async function obtenerCatalogo(filtros = {}) {
  const url = construirUrlCatalogo(filtros)

  try {
    const respuesta = await window.fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!respuesta.ok) {
      throw new Error(`Error al consultar el catálogo (HTTP ${respuesta.status}).`)
    }

    const cuerpo = await respuesta.json()
    if (Array.isArray(cuerpo?.resultados)) {
      return cuerpo.resultados
    }

    if (Array.isArray(cuerpo)) {
      return cuerpo
    }

    throw new Error('El formato recibido desde /api/catalogo no contiene una lista de resultados.')
  } catch (error) {
    // Respaldo limpio a datos de demostración únicamente en desarrollo local
    // cuando el API Gateway no está encendido (TypeError de red en fetch).
    if (import.meta.env?.DEV && error instanceof TypeError) {
      console.warn(
        'API Gateway no disponible en desarrollo local; se cargan contenidos de demostración.',
      )
      return contenidosDemo
    }

    throw error
  }
}

/**
 * Una página del catálogo con su paginación real (catalog-service → TMDB).
 * Devuelve { resultados, pagina, totalPaginas }. La galería la usa para
 * «Cargar más» sin traer todo el catálogo de golpe.
 */
export async function obtenerPaginaCatalogo({ categoria = 'Todos', emocion = null, busqueda = '', pagina = 1 } = {}) {
  const url = construirUrlCatalogo({ categoria, emocion, busqueda, pagina })

  let respuesta
  try {
    respuesta = await window.fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  } catch (error) {
    if (import.meta.env?.DEV && error instanceof TypeError) {
      console.warn('API Gateway no disponible en desarrollo local; se cargan contenidos de demostración.')
      return { resultados: contenidosDemo, pagina: 1, totalPaginas: 1 }
    }
    // Sin respuesta (red caída o un 502 de Render sin CORS): se puede reintentar.
    throw Object.assign(new Error('No pudimos conectar con el catálogo.'), { codigo: 'sin-conexion' })
  }

  if (!respuesta.ok) {
    // catalog-service dormido en Render: el navegador lo despierta (lib/despertar.js).
    despertarSiHaceFalta(respuesta)
    throw Object.assign(new Error(`Error al consultar el catálogo (HTTP ${respuesta.status}).`), { status: respuesta.status })
  }

  let cuerpo
  try {
    cuerpo = await respuesta.json()
  } catch {
    // Render responde una página HTML mientras despierta el servicio.
    throw Object.assign(new Error('El catálogo devolvió una respuesta inválida.'), { status: 502 })
  }
  const resultados = Array.isArray(cuerpo?.resultados) ? cuerpo.resultados : Array.isArray(cuerpo) ? cuerpo : null
  if (!resultados) {
    throw new Error('El formato recibido desde /api/catalogo no contiene una lista de resultados.')
  }
  const paginaActual = Number(cuerpo?.paginacion?.pagina) || pagina
  // Sin datos de paginación (respuesta antigua o lista simple) se asume una sola página.
  const totalPaginas = Number(cuerpo?.paginacion?.totalPaginas) || paginaActual
  return { resultados, pagina: paginaActual, totalPaginas }
}

/**
 * Obtiene el detalle enriquecido de una película o serie a través del API Gateway.
 */
export async function obtenerDetalleCatalogo(tipoTmdb, tmdbId) {
  const url = `${API_GATEWAY_URL}/api/catalogo/${encodeURIComponent(tipoTmdb)}/${encodeURIComponent(tmdbId)}`

  const respuesta = await window.fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (respuesta.status === 404) {
    return null
  }

  if (!respuesta.ok) {
    throw new Error(`Error al consultar el detalle del contenido (HTTP ${respuesta.status}).`)
  }

  return respuesta.json()
}