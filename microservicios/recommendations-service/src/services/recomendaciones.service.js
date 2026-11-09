import { esEmocionValida, MAXIMO_RESULTADOS, PAGINAS_CANDIDATAS } from '../constants/recomendaciones.js'
import { DependencyError } from '../clients/servicios.client.js'

function elementoValido(item, tipo) {
  return item && Number.isSafeInteger(item.tmdbId) && item.tmdbId > 0 &&
    item.tipoTmdb === tipo && typeof item.titulo === 'string' && item.titulo.trim() &&
    typeof item.descripcion === 'string' && (item.poster === null || typeof item.poster === 'string') &&
    (item.fecha === null || typeof item.fecha === 'string') &&
    (item.calificacion === null || (typeof item.calificacion === 'number' &&
      Number.isFinite(item.calificacion) && item.calificacion >= 0 && item.calificacion <= 10)) &&
    item.esDemostracion === false
}

/**
 * Ordena para que los primeros títulos sean diversos: se agrupan por su
 * género principal y se toman de a uno por grupo (en el orden de relevancia
 * del catálogo). Así las tres primeras recomendaciones de un escaneo no son
 * tres títulos del mismo género si hay alternativas.
 */
export function diversificar(items) {
  const grupos = new Map()
  for (const item of items) {
    const clave = Array.isArray(item.generos) && item.generos[0] ? item.generos[0] : 'otros'
    if (!grupos.has(clave)) grupos.set(clave, [])
    grupos.get(clave).push(item)
  }
  const colas = [...grupos.values()]
  const resultado = []
  while (colas.some((cola) => cola.length > 0)) {
    for (const cola of colas) if (cola.length > 0) resultado.push(cola.shift())
  }
  return resultado
}

export async function obtenerRecomendaciones({ emocion, animoId, tipo }, { consultar, config, authorization, perfil }) {
  if (animoId) {
    // El ánimo debe pertenecer al perfil activo: emotions-service lo verifica con X-Butaca-Perfil.
    const extra = perfil ? { 'X-Butaca-Perfil': perfil } : {}
    const animo = await consultar(config.emotionsServiceUrl, `/api/animos/${animoId}`, authorization, true, extra)
    if (!animo || typeof animo.id !== 'string' || animo.id.toLowerCase() !== animoId.toLowerCase() || !esEmocionValida(animo.emocion)) {
      throw new DependencyError(502, 'Respuesta inválida del servicio de emociones.')
    }
    if (animo.consentimientoHistorial === false) throw new DependencyError(404, 'El registro emocional no existe.')
    if (animo.consentimientoHistorial !== true) throw new DependencyError(502, 'Respuesta inválida del servicio de emociones.')
    emocion = animo.emocion
  }

  // catalog-service aplica la relación emoción → géneros (fuente única).
  const paginas = Array.from({ length: PAGINAS_CANDIDATAS }, (_, i) => i + 1)
  const listas = await Promise.all(paginas.map(async (pagina) => {
    const query = new URLSearchParams({ tipo, emocion, pagina: String(pagina) })
    const catalogo = await consultar(config.catalogServiceUrl, `/api/catalogo?${query}`)
    if (catalogo?.fuente !== 'tmdb' || !Array.isArray(catalogo.resultados) ||
        !catalogo.resultados.every((item) => elementoValido(item, tipo))) {
      throw new DependencyError(502, 'Respuesta inválida del servicio de catálogo.')
    }
    return catalogo.resultados
  }))

  // Defensa adicional: solo títulos que el catálogo relaciona con la emoción.
  const vistos = new Set()
  const candidatos = []
  for (const item of listas.flat()) {
    if (!Array.isArray(item.emociones) || !item.emociones.includes(emocion)) continue
    const key = `${item.tipoTmdb}:${item.tmdbId}`
    if (vistos.has(key)) continue
    vistos.add(key)
    candidatos.push(item)
  }

  const resultados = diversificar(candidatos).slice(0, MAXIMO_RESULTADOS)
    .map(({ tmdbId, titulo, descripcion, poster, fecha, calificacion }) => ({ tmdbId, titulo, descripcion, poster, fecha, calificacion, tipo }))
  return { emocion, tipo, fuente: 'tmdb', resultados }
}
