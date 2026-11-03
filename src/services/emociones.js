import { solicitarApi } from '../lib/api.js'
import { adaptarAnimo, adaptarListadoAnimos, construirQueryHistorial } from './contratos.js'

// Consultas al historial emocional (emotions-service, GET /api/animos).
// El usuario sale del token: nunca se envía un id y solo vuelven los registros
// propios guardados con consentimiento.

/** Una página del historial: { resultados, paginacion }. */
export async function listarAnimos(filtros = {}) {
  const query = construirQueryHistorial({ limite: 20, ...filtros })
  return adaptarListadoAnimos(await solicitarApi(`/api/animos?${query}`))
}

/**
 * Registros para estadísticas y gráficos: recorre páginas de 100 (el máximo
 * del contrato) hasta `maximo`. Devuelve también el total real para avisar
 * cuando el gráfico usa solo los más recientes.
 */
export async function listarAnimosParaEstadisticas(filtros = {}, maximo = 500) {
  const registros = []
  let pagina = 1
  let total = 0

  while (registros.length < maximo) {
    const { resultados, paginacion } = await listarAnimos({ ...filtros, pagina, limite: 100, orden: 'desc' })
    registros.push(...resultados)
    total = paginacion.total
    if (pagina >= paginacion.totalPaginas || resultados.length === 0) break
    pagina += 1
  }

  return { registros: registros.slice(0, maximo), total }
}

/** Un registro propio (GET /api/animos/:id); 404 si no existe o es de otra persona. */
export async function obtenerAnimo(id) {
  return adaptarAnimo(await solicitarApi(`/api/animos/${encodeURIComponent(id)}`))
}

/** Último ánimo guardado con consentimiento, o null si no hay ninguno. */
export async function obtenerUltimoAnimo() {
  const { resultados } = await listarAnimos({ limite: 1, orden: 'desc' })
  return resultados[0] ?? null
}
