import { categoriasPorEmocion, esEmocionValida } from '../constants/recomendaciones.js'
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

export async function obtenerRecomendaciones({ emocion, animoId, tipo }, { consultar, config, authorization }) {
  if (animoId) {
    const animo = await consultar(config.emotionsServiceUrl, `/api/animos/${animoId}`, authorization, true)
    if (!animo || typeof animo.id !== 'string' || animo.id.toLowerCase() !== animoId.toLowerCase() || !esEmocionValida(animo.emocion)) {
      throw new DependencyError(502, 'Respuesta inválida del servicio de emociones.')
    }
    if (animo.consentimientoHistorial === false) throw new DependencyError(404, 'El registro emocional no existe.')
    if (animo.consentimientoHistorial !== true) throw new DependencyError(502, 'Respuesta inválida del servicio de emociones.')
    emocion = animo.emocion
  }
  const listas = await Promise.all(categoriasPorEmocion[emocion].map(async (categoria) => {
    const query = new URLSearchParams({ tipo, categoria, pagina: '1' })
    const catalogo = await consultar(config.catalogServiceUrl, `/api/catalogo?${query}`)
    if (catalogo?.fuente !== 'tmdb' || !Array.isArray(catalogo.resultados) ||
        !catalogo.resultados.every((item) => elementoValido(item, tipo))) {
      throw new DependencyError(502, 'Respuesta inválida del servicio de catálogo.')
    }
    return catalogo.resultados
  }))
  const candidatos = listas.flatMap((lista, prioridad) => lista.map((item) => ({ item, prioridad })))
    .sort((a, b) => a.prioridad - b.prioridad ||
      (b.item.calificacion ?? -1) - (a.item.calificacion ?? -1) || a.item.tmdbId - b.item.tmdbId)
  const vistos = new Set()
  const resultados = []
  for (const { item } of candidatos) {
    const key = `${item.tipoTmdb}:${item.tmdbId}`
    if (vistos.has(key)) continue
    vistos.add(key)
    const { tmdbId, titulo, descripcion, poster, fecha, calificacion } = item
    resultados.push({ tmdbId, titulo, descripcion, poster, fecha, calificacion, tipo })
    if (resultados.length === 20) break
  }
  return { emocion, tipo, fuente: 'tmdb', resultados }
}
