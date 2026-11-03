import { obtenerDetalleCatalogo } from '../pages/Galeria/services/catalogo.js'

// /api/recomendaciones no incluye géneros. Se completan con el detalle real de
// catalog-service (GET /api/catalogo/:tipo/:tmdbId), con caché en memoria y
// pocas consultas simultáneas para no saturar TMDB.

const cache = new Map()
const SIMULTANEAS = 4

function detalle(tipoTmdb, tmdbId) {
  const clave = `${tipoTmdb}-${tmdbId}`
  if (!cache.has(clave)) {
    cache.set(
      clave,
      obtenerDetalleCatalogo(tipoTmdb, tmdbId).catch((error) => {
        cache.delete(clave)
        throw error
      }),
    )
  }
  return cache.get(clave)
}

/**
 * Llama a onDetalle(id, { generos, anio, backdrop }) a medida que llegan los
 * detalles. Los fallos individuales se ignoran: la tarjeta queda sin géneros.
 * Devuelve una función para cancelar los avisos pendientes.
 */
export function completarGeneros(contenidos, onDetalle) {
  let cancelado = false
  const cola = [...contenidos]

  const trabajar = async () => {
    while (!cancelado && cola.length > 0) {
      const contenido = cola.shift()
      try {
        const info = await detalle(contenido.tipoTmdb, contenido.tmdbId)
        if (!cancelado && info && Array.isArray(info.generos)) {
          onDetalle(contenido.id, {
            generos: info.generos.filter((genero) => typeof genero === 'string'),
            anio: Number.isInteger(info.anio) ? info.anio : contenido.anio ?? null,
            backdrop: typeof info.backdrop === 'string' ? info.backdrop : null,
          })
        }
      } catch {
        // Sin detalle: la tarjeta muestra los datos de la recomendación.
      }
    }
  }

  for (let i = 0; i < SIMULTANEAS; i += 1) trabajar()
  return () => {
    cancelado = true
  }
}
