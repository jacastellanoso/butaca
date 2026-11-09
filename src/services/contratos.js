// Validación de las respuestas reales de emotions-service y library-service.
// Lógica pura (sin red) para poder probarla con node --test. Si el backend
// devuelve algo fuera de contrato se lanza RespuestaInvalidaError y la
// pantalla muestra un error, nunca datos a medias.

export const EMOCIONES = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']
const ORIGENES = ['deteccion', 'confirmada']
const TIPOS = ['movie', 'tv']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class RespuestaInvalidaError extends Error {
  constructor(recurso) {
    super(`El servicio devolvió ${recurso} con un formato inesperado.`)
    this.name = 'RespuestaInvalidaError'
    this.codigo = 'respuesta-invalida'
  }
}

const esFecha = (valor) => typeof valor === 'string' && !Number.isNaN(Date.parse(valor))
const esTextoONulo = (valor) => valor === null || typeof valor === 'string'
const esNumeroEn = (valor, min, max) => typeof valor === 'number' && Number.isFinite(valor) && valor >= min && valor <= max
const esTmdbId = (valor) => Number.isSafeInteger(valor) && valor > 0

function validarPaginacion(paginacion, recurso) {
  const { pagina, limite, total, totalPaginas } = paginacion ?? {}
  if (![pagina, limite, total, totalPaginas].every((n) => Number.isInteger(n) && n >= 0) || pagina < 1 || limite < 1) {
    throw new RespuestaInvalidaError(recurso)
  }
  return { pagina, limite, total, totalPaginas }
}

function validarListado(cuerpo, recurso, adaptar) {
  if (!cuerpo || !Array.isArray(cuerpo.resultados)) throw new RespuestaInvalidaError(recurso)
  return {
    resultados: cuerpo.resultados.map(adaptar),
    paginacion: validarPaginacion(cuerpo.paginacion, recurso),
  }
}

// GET/POST /api/animos → { id, emocion, confianza, origen, consentimientoHistorial, creadoEn, ... }
export function adaptarAnimo(item) {
  if (!item || !UUID.test(item.id ?? '') || !EMOCIONES.includes(item.emocion) ||
      !ORIGENES.includes(item.origen) || !esFecha(item.creadoEn) ||
      !(item.confianza === null || esNumeroEn(item.confianza, 0, 1)) ||
      item.consentimientoHistorial !== true) {
    throw new RespuestaInvalidaError('el historial emocional')
  }
  return {
    id: item.id,
    emocion: item.emocion,
    confianza: item.confianza,
    origen: item.origen,
    creadoEn: new Date(item.creadoEn),
  }
}

// /api/favoritos → { id, tmdbId, tipo, titulo, poster, creadoEn }
export function adaptarFavorito(item) {
  if (!item || !UUID.test(item.id ?? '') || !esTmdbId(item.tmdbId) || !TIPOS.includes(item.tipo) ||
      typeof item.titulo !== 'string' || !item.titulo.trim() || !esTextoONulo(item.poster) ||
      !esFecha(item.creadoEn)) {
    throw new RespuestaInvalidaError('los favoritos')
  }
  return {
    id: item.id,
    tmdbId: item.tmdbId,
    tipoTmdb: item.tipo,
    tipo: item.tipo === 'movie' ? 'Película' : 'Serie',
    titulo: item.titulo,
    poster: item.poster,
    creadoEn: new Date(item.creadoEn),
  }
}

// /api/historial → { id, emocion, tmdbId, tipo, titulo, poster, calificacion, creadoEn }
export function adaptarHistorial(item) {
  if (!item || !UUID.test(item.id ?? '') || !EMOCIONES.includes(item.emocion) ||
      !esTmdbId(item.tmdbId) || !TIPOS.includes(item.tipo) ||
      typeof item.titulo !== 'string' || !item.titulo.trim() || !esTextoONulo(item.poster) ||
      !(item.calificacion === null || esNumeroEn(item.calificacion, 0, 10)) || !esFecha(item.creadoEn)) {
    throw new RespuestaInvalidaError('el historial de recomendaciones')
  }
  return {
    id: item.id,
    emocion: item.emocion,
    tmdbId: item.tmdbId,
    tipoTmdb: item.tipo,
    tipo: item.tipo === 'movie' ? 'Película' : 'Serie',
    titulo: item.titulo,
    poster: item.poster,
    calificacion: item.calificacion,
    creadoEn: new Date(item.creadoEn),
  }
}

export const adaptarListadoAnimos = (cuerpo) => validarListado(cuerpo, 'el historial emocional', adaptarAnimo)
export const adaptarListadoFavoritos = (cuerpo) => validarListado(cuerpo, 'los favoritos', adaptarFavorito)
export const adaptarListadoHistorial = (cuerpo) =>
  validarListado(cuerpo, 'el historial de recomendaciones', adaptarHistorial)

/**
 * Convierte filtros de la interfaz (fechas YYYY-MM-DD en hora local) a la
 * query que aceptan /api/animos y /api/historial. Omite valores vacíos.
 */
export function construirQueryHistorial({ pagina, limite, emocion, tipo, desde, hasta, orden } = {}) {
  const query = new URLSearchParams()
  if (pagina) query.set('pagina', String(pagina))
  if (limite) query.set('limite', String(limite))
  if (EMOCIONES.includes(emocion)) query.set('emocion', emocion)
  if (TIPOS.includes(tipo)) query.set('tipo', tipo)
  const inicio = fechaLocal(desde, false)
  const fin = fechaLocal(hasta, true)
  if (inicio) query.set('desde', inicio.toISOString())
  if (fin) query.set('hasta', fin.toISOString())
  if (orden === 'asc' || orden === 'desc') query.set('orden', orden)
  return query
}

function fechaLocal(valor, finDelDia) {
  const coincide = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor ?? '')
  if (!coincide) return null
  const [, anio, mes, dia] = coincide.map(Number)
  const fecha = finDelDia
    ? new Date(anio, mes - 1, dia, 23, 59, 59, 999)
    : new Date(anio, mes - 1, dia, 0, 0, 0, 0)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}
