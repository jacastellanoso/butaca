import { ApiError, solicitarApi } from '../lib/api.js'

const emociones = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']
const tipos = ['movie', 'tv']
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parametrosInvalidos() {
  return new ApiError('parametros-invalidos', 'Indicá una emoción válida o un animoId UUID, y tipo movie o tv.', 400)
}

function respuestaInvalida() {
  return new ApiError('respuesta-invalida', 'El servicio devolvió recomendaciones inválidas.', 502)
}

function adaptarContenido(item, tipo) {
  if (!item || !Number.isSafeInteger(item.tmdbId) || item.tmdbId <= 0 ||
      item.tipo !== tipo || typeof item.titulo !== 'string' || !item.titulo.trim() ||
      typeof item.descripcion !== 'string' ||
      !(item.poster === null || typeof item.poster === 'string') ||
      !(item.fecha === null || typeof item.fecha === 'string') ||
      !(item.calificacion === null || (Number.isFinite(item.calificacion) &&
        item.calificacion >= 0 && item.calificacion <= 10))) {
    throw respuestaInvalida()
  }

  // El año se deriva de la fecha recibida; los géneros no vienen en este contrato.
  const anio = /^\d{4}-\d{2}-\d{2}$/.test(item.fecha ?? '') ? Number(item.fecha.slice(0, 4)) : null
  return {
    id: `${tipo}-${item.tmdbId}`,
    tmdbId: item.tmdbId,
    tipoTmdb: tipo,
    tipo: tipo === 'movie' ? 'Película' : 'Serie',
    titulo: item.titulo,
    descripcion: item.descripcion,
    sinopsis: item.descripcion,
    poster: item.poster,
    portada: item.poster,
    fecha: item.fecha,
    anio,
    generos: [],
    calificacion: item.calificacion,
    esDemostracion: false,
  }
}

/**
 * Consulta autenticada sin guardar historial. Exige exactamente emocion o animoId.
 * Devuelve { emocion, tipo: 'movie'|'tv', fuente: 'tmdb', resultados }.
 * resultados se puede pasar a CuadriculaContenido/DetalleContenido; generos: []
 * significa información no proporcionada, no una clasificación editorial.
 * Los fallos se rechazan con ApiError (codigo, message, status); nunca hay demos.
 */
export async function obtenerRecomendaciones(parametros = {}) {
  if (!parametros || typeof parametros !== 'object' || Array.isArray(parametros) ||
      Object.entries(parametros).some(([key, value]) =>
        !['emocion', 'animoId', 'tipo'].includes(key) || typeof value !== 'string')) {
    throw parametrosInvalidos()
  }
  const { emocion, animoId, tipo = 'movie' } = parametros
  if ((emocion !== undefined) === (animoId !== undefined) ||
      (emocion !== undefined && !emociones.includes(emocion)) ||
      (animoId !== undefined && !uuid.test(animoId)) || !tipos.includes(tipo)) {
    throw parametrosInvalidos()
  }

  const query = new URLSearchParams(emocion !== undefined ? { emocion, tipo } : { animoId, tipo })
  const respuesta = await solicitarApi(`/api/recomendaciones?${query}`)
  if (!respuesta || respuesta.fuente !== 'tmdb' || respuesta.tipo !== tipo ||
      !emociones.includes(respuesta.emocion) ||
      (emocion !== undefined && respuesta.emocion !== emocion) ||
      !Array.isArray(respuesta.resultados)) {
    throw respuestaInvalida()
  }
  const resultados = respuesta.resultados.map((item) => adaptarContenido(item, tipo))
  if (new Set(resultados.map((item) => item.id)).size !== resultados.length) throw respuestaInvalida()
  return { emocion: respuesta.emocion, tipo, fuente: 'tmdb', resultados }
}
